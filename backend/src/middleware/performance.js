export function performanceMonitoring(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // You can send this to your monitoring service
    // sendMetric('request_duration', duration, { path: req.path, method: req.method });
  });
  
  next();
}