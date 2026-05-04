import * as faceLandmarks from '@tensorflow-models/face-landmarks-detection';
import * as mp from '@mediapipe/tasks-vision';

console.log('mp exports:', Object.keys(mp));
console.log('FilesetResolver:', mp.FilesetResolver);

console.log('faceLandmarks exports:', Object.keys(faceLandmarks));
