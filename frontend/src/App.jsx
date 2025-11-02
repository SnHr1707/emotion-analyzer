import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import CharacterAnalysisView from './components/CharacterAnalysisView';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const EMOTION_COLORS = {
    'joy': 'bg-yellow-200', 'trust': 'bg-green-200', 'fear': 'bg-orange-300',
    'surprise': 'bg-purple-300', 'sadness': 'bg-blue-300', 'disgust': 'bg-lime-300',
    'anger': 'bg-red-300', 'anticipation': 'bg-amber-200'
};
const DEFAULT_COLOR = 'bg-gray-200';

function App() {
    const [text, setText] = useState('');
    const [sentenceAnalysis, setSentenceAnalysis] = useState([]);
    const [characterAnalysis, setCharacterAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('sentence');

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setError(''); // Clear previous errors on new file upload

        if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => setText(e.target.result);
            reader.readAsText(file);
        } else if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const typedarray = new Uint8Array(e.target.result);
                try {
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                    }
                    setText(fullText);
                } catch (pdfError) {
                    setError("Failed to read the PDF file. It might be corrupted or protected.");
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            setError('Unsupported file type. Please upload a .txt or .pdf file.');
        }
    };

    const handleAnalyze = async () => {
        if (!text.trim()) {
            setError('Please enter some text to analyze.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSentenceAnalysis([]);
        setCharacterAnalysis(null);

        const endpoint = activeTab === 'sentence' ? 'http://localhost:5000/analyze' : 'http://localhost:5000/analyze_characters';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to get a response from the server.');
            }

            const data = await response.json();
            if (activeTab === 'sentence') {
                setSentenceAnalysis(data);
            } else {
                setCharacterAnalysis(data);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-center text-gray-800 mb-6">Emotion Analyzer</h1>
                
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <textarea
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        rows="10"
                        placeholder="Type or paste a transcript here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    ></textarea>
                    
                    <div className="my-4 border-b border-gray-200">
                        <nav className="-mb-px flex space-x-6">
                            <button
                                onClick={() => setActiveTab('sentence')}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'sentence' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Sentence Analysis
                            </button>
                            <button
                                onClick={() => setActiveTab('character')}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'character' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Character Analysis
                            </button>
                        </nav>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between">
                        <div className="mb-4 sm:mb-0">
                            {/* <<< FIX: The file upload button code is restored here. */}
                            <label htmlFor="file-upload" className="cursor-pointer bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition">
                                Upload .txt or .pdf
                            </label>
                            <input id="file-upload" type="file" className="hidden" accept=".txt,.pdf" onChange={handleFileChange} />
                        </div>
                        <button
                            onClick={handleAnalyze}
                            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition disabled:bg-blue-300"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Analyzing...' : `Analyze ${activeTab === 'sentence' ? 'Sentences' : 'Characters'}`}
                        </button>
                    </div>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">{error}</div>}

                {activeTab === 'sentence' && sentenceAnalysis.length > 0 && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Sentence Analysis Results</h2>
                        <div>
                            {sentenceAnalysis.map((item, index) => {
                                const color = item.emotions.length > 0 ? EMOTION_COLORS[item.emotions[0]] : DEFAULT_COLOR;
                                const label = item.emotions.length > 0 ? item.emotions.join(', ') : 'No Strong Emotion';
                                
                                return (
                                    <span key={index} className={`${color} p-2 m-1 rounded-md inline-block`}>
                                        {item.sentence} <strong className="font-semibold">[{label}]</strong>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'character' && characterAnalysis && (
                    <CharacterAnalysisView analysisData={characterAnalysis} />
                )}
            </div>
        </div>
    );
}

export default App;