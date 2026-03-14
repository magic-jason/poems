import React from 'react';

export interface StudyCardProps {
    title: string;
    author: string;
    dynasty: string;
    imageUrl: string;
    analysis: string;
    pinyinData: Array<{ char: string; pinyin: string }>;
    vocabulary?: Array<{ word: string; explanation: string }>;
    authorIntro?: string;
}

export const StudyCard = React.forwardRef<HTMLDivElement, StudyCardProps>(({
    title, author, dynasty, imageUrl, analysis, authorIntro, pinyinData, vocabulary
}, ref) => {
    return (
        <div
            ref={ref}
            className="bg-[#F8F9FA] w-[800px] flex flex-col p-12 text-[#202124] relative overflow-hidden"
            style={{
                boxShadow: '0 0 20px rgba(0,0,0,0.05)',
                // 使用一个 subtle 的边框模拟装裱感
                border: '1px solid #E0E0E0',
            }}
        >
            {/* 顶部标识区 */}
            <div className="flex justify-between items-center mb-8 border-b border-[#E0E0E0] pb-6">
                <div className="flex flex-col">
                    <h2 className="text-4xl font-serif tracking-widest whitespace-nowrap">{title}</h2>
                    <span className="text-xl text-[#5F6368] mt-2 font-serif whitespace-nowrap">
                        [{dynasty}] {author}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* 模拟印章 */}
                    <div className="w-10 h-10 border-2 border-[#D93025] text-[#D93025] flex items-center justify-center font-serif text-sm font-bold rotate-[-5deg]">
                        墨影<br />灵笔
                    </div>
                </div>
            </div>

            {/* 中心画作区 */}
            <div className="w-full mb-10 overflow-hidden relative">
                <img
                    src={imageUrl}
                    alt="AI Generated Artwork"
                    className="w-full h-auto object-cover"
                />
                {/* 微妙的内阴影边框增加作品感 */}
                <div className="absolute inset-0 border border-black/10 pointer-events-none" />
            </div>

            {/* 古诗拼音区 */}
            <div className="mb-12">
                <div className="flex flex-wrap gap-x-4 gap-y-8 justify-center leading-loose">
                    {pinyinData.map((item, index) => {
                        // 标点符号不加拼音，直接渲染
                        const isPunctuation = !item.pinyin || item.pinyin.trim() === '';

                        if (isPunctuation) {
                            return (
                                <span key={index} className="text-3xl font-serif flex items-end pb-[4px]">
                                    {item.char}
                                </span>
                            );
                        }

                        return (
                            <ruby key={index} className="text-3xl font-serif text-center px-1">
                                {item.char}
                                {/* 拼音使用现代无衬线字体，颜色稍浅，大小合适 */}
                                <rt className="text-sm font-sans text-[#5F6368] mb-1 tracking-wider" style={{ userSelect: 'none' }}>
                                    {item.pinyin}
                                </rt>
                            </ruby>
                        );
                    })}
                </div>
            </div>

            {/* 重点词汇解释区 */}
            {vocabulary && vocabulary.length > 0 && (
                <div className="mb-12 w-full border-t border-dashed border-[#E0E0E0] pt-8">
                    <div className="text-sm tracking-widest text-[#70757A] mb-6 uppercase flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#D93025]" />
                        重点词汇解意
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {vocabulary.map((v, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <span className="font-serif font-bold text-[#202124] text-lg whitespace-nowrap leading-relaxed">
                                    {v.word}
                                </span>
                                <span className="text-[#5F6368] font-sans text-sm leading-relaxed mt-0.5">
                                    {v.explanation}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 底部信息区 */}
            <div className="mt-auto pt-8 border-t border-[#E0E0E0] grid grid-cols-2 gap-8">
                <div>
                    <div className="text-sm tracking-widest text-[#70757A] mb-2 uppercase flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#1A73E8]" />
                        AI 意境赏析
                    </div>
                    <p className="text-base text-[#5F6368] leading-relaxed font-sans mt-2">
                        「 {analysis} 」
                    </p>
                </div>

                {authorIntro && (
                    <div>
                        <div className="text-sm tracking-widest text-[#70757A] mb-2 uppercase flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#1E8E3E]" />
                            作者介绍
                        </div>
                        <p className="text-base text-[#5F6368] leading-relaxed font-sans mt-2">
                            {authorIntro}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
});

StudyCard.displayName = 'StudyCard';
