import React from 'react';

const EMOTION_COLORS = {
    'joy': 'bg-yellow-200', 'trust': 'bg-green-200', 'fear': 'bg-orange-300',
    'surprise': 'bg-purple-300', 'sadness': 'bg-blue-300', 'disgust': 'bg-lime-300',
    'anger': 'bg-red-300', 'anticipation': 'bg-amber-200'
};
const DEFAULT_COLOR = 'bg-gray-200';

const CharacterAnalysisView = ({ analysisData }) => {
    const characters = Object.keys(analysisData);

    if (characters.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <h2 className="text-2xl font-semibold mb-2 text-gray-700">Character Analysis Results</h2>
                <p className="text-gray-500">No characters were identified in the text, or they were not associated with any emotional sentences.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Character Analysis Results</h2>
            <div className="space-y-6">
                {characters.map(character => (
                    <div key={character} className="border border-gray-200 p-4 rounded-lg">
                        <h3 className="text-xl font-bold text-gray-800 mb-3">{character}'s Emotional Journey</h3>
                        <div className="space-y-2">
                            {analysisData[character].map((item, index) => {
                                const color = item.emotions.length > 0 ? EMOTION_COLORS[item.emotions[0]] : DEFAULT_COLOR;
                                const label = item.emotions.length > 0 ? item.emotions.join(', ') : 'Neutral';
                                
                                return (
                                    <div key={index} className="flex items-start">
                                        <div className={`w-3 h-3 rounded-full mt-1.5 mr-3 ${color}`}></div>
                                        <p className="flex-1">
                                            {item.sentence} <strong className="font-semibold text-gray-600">[{label}]</strong>
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CharacterAnalysisView;