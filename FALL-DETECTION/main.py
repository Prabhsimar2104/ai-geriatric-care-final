import cv2
import cvzone
import math
from ultralytics import YOLO
import requests
from datetime import datetime
import time
import os
from dotenv import load_dotenv
from cloudinary_upload import upload_fall_image

# Load environment variables
load_dotenv()

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:4000')
FALL_ALERT_TOKEN = os.getenv('FALL_ALERT_TOKEN', 'secret_token_for_fall_detection')
USER_ID = int(os.getenv('USER_ID', '1'))  # Default user ID (elderly person being monitored)

# Fall detection settings
FALL_CONFIDENCE_THRESHOLD = 80  # Minimum confidence for person detection
FALL_COOLDOWN = 30  # Seconds between fall alert notifications (prevent spam)

# Track last alert time
last_alert_time = 0
fall_detected_frames = 0  # Count consecutive frames with fall detected
CONSECUTIVE_FRAMES_THRESHOLD = 5  # Require N consecutive frames to confirm fall

# Initialize video capture and model
cap = cv2.VideoCapture(0)
model = YOLO('yolov8s.pt')

# Load class names
classnames = []
with open('classes.txt', 'r') as f:
    classnames = f.read().splitlines()

def send_fall_alert(confidence, frame=None):
    """
    Send fall detection alert to backend API
    """
    global last_alert_time
    
    current_time = time.time()
    
    # Check cooldown period to prevent spam
    if current_time - last_alert_time < FALL_COOLDOWN:
        print(f"⏳ Cooldown active. {int(FALL_COOLDOWN - (current_time - last_alert_time))}s remaining")
        return False
    
    try:
        # Prepare alert data
        alert_data = {
            'userId': USER_ID,
            'timestamp': datetime.now().isoformat(),
            'confidence': float(confidence) / 100.0  # Convert to 0-1 range
        }
        
        # Save frame and upload to Cloudinary
        image_url = None
        if frame is not None:
            # Save frame locally
            os.makedirs('alerts', exist_ok=True)
            filename = f"alerts/fall_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            cv2.imwrite(filename, frame)
            print(f"📸 Frame saved: {filename}")
            
            # Upload to Cloudinary (if configured)
            if os.getenv('CLOUDINARY_CLOUD_NAME'):
                print("☁️  Uploading to Cloudinary...")
                image_url = upload_fall_image(filename, USER_ID)
                if image_url:
                    alert_data['imageUrl'] = image_url
            else:
                print("⚠️  Cloudinary not configured, image stored locally only")
        
        # Send POST request to backend
        headers = {
            'X-API-KEY': FALL_ALERT_TOKEN,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/notify/fall-alert",
            json=alert_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 201:
            print("✅ Fall alert sent successfully!")
            print(f"   Response: {response.json()}")
            last_alert_time = current_time
            return True
        else:
            print(f"❌ Failed to send alert. Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection error: Backend server not reachable")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timeout: Backend took too long to respond")
        return False
    except Exception as e:
        print(f"❌ Error sending fall alert: {str(e)}")
        return False

def detect_fall(x1, y1, x2, y2):
    """
    Detect if person has fallen based on bounding box dimensions
    Returns True if fall detected, False otherwise
    """
    height = y2 - y1
    width = x2 - x1
    threshold = height - width
    
    # Fall detected when width > height (person is horizontal)
    return threshold < 0

print("🚀 Fall Detection System Started")
print(f"📡 Backend URL: {BACKEND_URL}")
print(f"👤 Monitoring User ID: {USER_ID}")
print(f"⏱️  Cooldown Period: {FALL_COOLDOWN} seconds")
print("\n🎥 Press 'q' to quit\n")

while True:
    ret, frame = cap.read()
    
    if not ret:
        print("❌ Failed to read frame from camera")
        break
    
    frame = cv2.resize(frame, (980, 740))
    results = model(frame)
    
    current_frame_fall = False
    
    for info in results:
        parameters = info.boxes
        for box in parameters:
            x1, y1, x2, y2 = box.xyxy[0]
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            confidence = box.conf[0]
            class_detect = box.cls[0]
            class_detect = int(class_detect)
            class_detect = classnames[class_detect]
            conf = math.ceil(confidence * 100)
            
            # Calculate dimensions
            height = y2 - y1
            width = x2 - x1
            
            # Only process if it's a person with high confidence
            if conf > FALL_CONFIDENCE_THRESHOLD and class_detect == 'person':
                # Draw bounding box
                cvzone.cornerRect(frame, [x1, y1, width, height], l=30, rt=6)
                cvzone.putTextRect(frame, f'{class_detect} {conf}%', 
                                 [x1 + 8, y1 - 12], thickness=2, scale=1.5)
                
                # Check for fall
                if detect_fall(x1, y1, x2, y2):
                    current_frame_fall = True
                    
                    # Draw red rectangle for fall
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                    cvzone.putTextRect(frame, '🚨 FALL DETECTED!', 
                                     [50, 50], thickness=3, scale=3, 
                                     colorR=(0, 0, 255))
                    
                    # Display dimensions for debugging
                    cvzone.putTextRect(frame, f'W:{width} H:{height}', 
                                     [x1 + 8, y2 + 30], thickness=1, scale=1)
    
    # Track consecutive frames with fall
    if current_frame_fall:
        fall_detected_frames += 1
        
        # Send alert only after consecutive frames threshold
        if fall_detected_frames >= CONSECUTIVE_FRAMES_THRESHOLD:
            print(f"\n⚠️  FALL CONFIRMED ({fall_detected_frames} consecutive frames)")
            send_fall_alert(FALL_CONFIDENCE_THRESHOLD, frame)
            fall_detected_frames = 0  # Reset counter after sending alert
    else:
        fall_detected_frames = 0  # Reset if no fall in current frame
    
    # Display frame counter if fall is being tracked
    if fall_detected_frames > 0:
        cvzone.putTextRect(frame, f'Confirming... {fall_detected_frames}/{CONSECUTIVE_FRAMES_THRESHOLD}', 
                         [50, 120], thickness=2, scale=2, colorR=(255, 128, 0))
    
    # Display cooldown timer
    if time.time() - last_alert_time < FALL_COOLDOWN:
        remaining = int(FALL_COOLDOWN - (time.time() - last_alert_time))
        cvzone.putTextRect(frame, f'Cooldown: {remaining}s', 
                         [780, 50], thickness=2, scale=1.5, colorR=(128, 128, 128))
    
    cv2.imshow('Fall Detection System', frame)
    
    # Press 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        print("\n👋 Shutting down...")
        break

cap.release()
cv2.destroyAllWindows()
print("✅ Fall Detection System stopped")