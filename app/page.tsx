"use client";

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import * as faceapi from 'face-api.js';
import Tesseract from 'tesseract.js';
import styles from '../styles/Home.module.css';

// @ts-ignore
const Webcam = dynamic(() => import('react-webcam'), { ssr: false });

const Home = () => {
    const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
    const [detections, setDetections] = useState<faceapi.WithFaceExpressions<faceapi.WithAge<faceapi.WithGender<faceapi.DetectSingleFaceResult>> | undefined>>();
    const [ocrText, setOcrText] = useState<string>('');
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [colorFilter, setColorFilter] = useState<string>('none');
    const webcamRef = useRef<Webcam>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            console.log('Loading models...');
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
            setModelsLoaded(true);
            console.log('Models loaded');
        };

        loadModels();
        getLocation();
    }, []);

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                console.log('Location obtained:', position.coords);
            });
        }
    };

    const handleCapture = async () => {
        console.log('Button clicked');
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            console.log('Image captured');
            const img = new Image();
            img.src = imageSrc;
            //@ts-ignore
            imgRef.current.src = imageSrc;
            img.onload = async () => {
                console.log('Image loaded');
                if (modelsLoaded) {
                    console.log('Detecting faces...');
                    const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withAgeAndGender();
                    setDetections(detections);
                    console.log('Detections:', detections);
                }

                console.log('Recognizing text...');
                Tesseract.recognize(
                    img,
                    'eng',
                    {
                        logger: m => console.log(m),
                    }
                ).then(({ data: { text } }) => {
                    setOcrText(text);
                    console.log('OCR Text:', text);
                });
            };
        } else {
            console.error('No image captured');
        }
    };

    const handleImageClick = () => {
        console.log('Image clicked');
        setColorFilter(colorFilter === 'none' ? 'grayscale(100%)' : 'none');
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Image Processing App</h1>
            <button onClick={handleCapture} className={styles.button}>Get Quick Quote</button>
            <Webcam
                audio={false}
                //@ts-ignore
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className={styles.webcam}
            />
            <img
                ref={imgRef}
                alt="Captured"
                onClick={handleImageClick}
                className={styles.capturedImage}
                style={{ filter: colorFilter }}
            />
            <div className={styles.results}>
                {detections && (
                    <div>
                        <h2 className={styles.subtitle}>Detected Faces</h2>
                        <ul className={styles.list}>
                            <li className={styles.listItem}>
                                Age: {detections.age.toFixed(0)}, Gender: {detections.gender}
                            </li>
                        </ul>
                    </div>
                )}
                {ocrText && (
                    <div>
                        <h2 className={styles.subtitle}>OCR Text</h2>
                        <p>{ocrText}</p>
                    </div>
                )}
                {location && (
                    <div>
                        <h2 className={styles.subtitle}>Location</h2>
                        <p>Latitude: {location.latitude}, Longitude: {location.longitude}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
