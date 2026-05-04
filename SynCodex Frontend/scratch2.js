import { FaceDetector } from '@mediapipe/tasks-vision';

console.log('FaceDetector methods:', Object.getOwnPropertyNames(FaceDetector));
console.log('createFromModelPath exists?', typeof FaceDetector.createFromModelPath === 'function');
console.log('createFromOptions exists?', typeof FaceDetector.createFromOptions === 'function');
