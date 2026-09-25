'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Image as ImageIcon, Type, Layout, ArrowRightLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardSide {
    text: string;
    imageUrl?: string;
}

interface Flashcard {
    id: string;
    front: CardSide;
    back: CardSide;
}

interface FlashcardBuilderProps {
    onChange: (content: { cards: Flashcard[] }) => void;
    initialData?: { cards: Flashcard[] };
}

export function FlashcardBuilder({ onChange, initialData }: FlashcardBuilderProps) {
    const [cards, setCards] = useState<Flashcard[]>(
        initialData?.cards || [
            {
                id: crypto.randomUUID(),
                front: { text: '' },
                back: { text: '' }
            }
        ]
    )

    const updateCards = (newCards: Flashcard[]) => {
        setCards(newCards);
        onChange({ cards: newCards });
    }

    // Pass initial state to parent on mount so default card is captured
    useState(() => {
        onChange({ cards });
    });

    const addCard = () => {
        const newCard: Flashcard = {
            id: crypto.randomUUID(),
            front: { text: '' },
            back: { text: '' }
        };
        updateCards([...cards, newCard]);
    }

    const removeCard = (id: string) => {
        updateCards(cards.filter(c => c.id !== id));
    }

    const updateCardSide = (id: string, side: 'front' | 'back', updates: Partial<CardSide>) => {
        updateCards(cards.map(c => {
            if (c.id === id) {
                return {
                    ...c,
                    [side]: { ...c[side], ...updates }
                };
            }
            return c;
        }));
    }

    return (
        <div className="space-y-12 pb-20">
            {cards.map((card, index) => (
                <div key={card.id} className="relative group animate-in fade-in slide-in-from-bottom-6 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="absolute -left-12 top-2 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        {index + 1}
                    </div>

                    <Card className="rounded-[2.5rem] p-8 border-border/40 shadow-xl bg-card transition-all hover:shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center mb-8 border-b border-border/40 pb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Layout size={14} />
                                Card Configuration
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCard(card.id)}
                                className="text-muted-foreground hover:text-red-500 rounded-full h-10 w-10"
                            >
                                <Trash2 size={18} />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Front Side */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 px-3 py-1 bg-muted/40 rounded-full w-fit">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Front Side</span>
                                </div>

                                <SideEditor
                                    side={card.front}
                                    onUpdate={(updates) => updateCardSide(card.id, 'front', updates)}
                                />
                            </div>

                            {/* Back Side */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 px-3 py-1 bg-muted/40 rounded-full w-fit">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Back Side</span>
                                </div>

                                <SideEditor
                                    side={card.back}
                                    onUpdate={(updates) => updateCardSide(card.id, 'back', updates)}
                                />
                            </div>
                        </div>
                    </Card>
                </div>
            ))}

            <Button
                onClick={addCard}
                className="w-full h-16 rounded-[2.5rem] bg-indigo-50 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-400 transition-all font-black uppercase tracking-widest text-xs gap-3 shadow-sm"
            >
                <Plus size={20} />
                Add New Card to Deck
            </Button>
        </div>
    )
}

function SideEditor({ side, onUpdate }: { side: CardSide, onUpdate: (updates: Partial<CardSide>) => void }) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic ml-1 flex items-center gap-1">
                    <Type size={12} />
                    Text Content
                </Label>
                <textarea
                    placeholder="Enter text..."
                    value={side.text}
                    onChange={(e) => onUpdate({ text: e.target.value })}
                    className="w-full h-24 rounded-2xl bg-muted/20 border-none outline-none p-4 lg:p-6 font-medium text-sm focus:ring-2 focus:ring-indigo-600 transition-all resize-none"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic ml-1 flex items-center gap-1">
                    <ImageIcon size={12} />
                    Visual Image URL
                </Label>
                <Input
                    placeholder="https://..."
                    value={side.imageUrl || ''}
                    onChange={(e) => onUpdate({ imageUrl: e.target.value })}
                    className="h-12 border-none bg-muted/20 rounded-xl px-4 text-xs font-mono"
                />
            </div>

            {side.imageUrl && (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted/10 border border-border/20 group">
                    <img
                        src={side.imageUrl}
                        alt="Preview"
                        onLoad={(e) => { }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/indigo/white?text=Invalid+Image';
                        }}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <ImageIcon size={12} className="text-white" />
                    </div>
                </div>
            )}
        </div>
    )
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("bg-card border rounded-3xl", className)}>{children}</div>
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <label className={cn("block text-sm font-medium", className)}>{children}</label>
}
