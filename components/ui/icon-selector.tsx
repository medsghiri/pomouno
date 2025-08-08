"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search } from 'lucide-react';

export interface IconItem {
    id: string;
    emoji: string;
    name: string;
    keywords: string[];
}

export interface IconCategory {
    name: string;
    icons: IconItem[];
}

// Curated icon list similar to Apple Reminders
const ICON_CATEGORIES: IconCategory[] = [
    {
        name: 'Work & Productivity',
        icons: [
            { id: 'briefcase', emoji: '💼', name: 'Briefcase', keywords: ['work', 'business', 'job', 'office'] },
            { id: 'laptop', emoji: '💻', name: 'Laptop', keywords: ['computer', 'work', 'coding', 'tech'] },
            { id: 'chart', emoji: '📊', name: 'Chart', keywords: ['analytics', 'data', 'business', 'stats'] },
            { id: 'calendar', emoji: '📅', name: 'Calendar', keywords: ['schedule', 'date', 'planning', 'time'] },
            { id: 'clipboard', emoji: '📋', name: 'Clipboard', keywords: ['tasks', 'checklist', 'notes', 'todo'] },
            { id: 'pencil', emoji: '✏️', name: 'Pencil', keywords: ['write', 'edit', 'notes', 'draft'] },
            { id: 'lightbulb', emoji: '💡', name: 'Light Bulb', keywords: ['idea', 'creative', 'innovation', 'think'] },
            { id: 'target', emoji: '🎯', name: 'Target', keywords: ['goal', 'focus', 'aim', 'objective'] },
        ]
    },
    {
        name: 'Health & Wellness',
        icons: [
            { id: 'water', emoji: '💧', name: 'Water Drop', keywords: ['hydration', 'drink', 'health', 'water'] },
            { id: 'apple', emoji: '🍎', name: 'Apple', keywords: ['food', 'healthy', 'nutrition', 'fruit'] },
            { id: 'running', emoji: '🏃', name: 'Running', keywords: ['exercise', 'fitness', 'cardio', 'movement'] },
            { id: 'meditation', emoji: '🧘', name: 'Meditation', keywords: ['mindfulness', 'peace', 'relax', 'zen'] },
            { id: 'heart', emoji: '❤️', name: 'Heart', keywords: ['health', 'love', 'care', 'wellness'] },
            { id: 'muscle', emoji: '💪', name: 'Muscle', keywords: ['strength', 'fitness', 'workout', 'exercise'] },
            { id: 'sleep', emoji: '😴', name: 'Sleep', keywords: ['rest', 'tired', 'bed', 'recovery'] },
            { id: 'pill', emoji: '💊', name: 'Pill', keywords: ['medicine', 'health', 'medication', 'vitamin'] },
        ]
    },
    {
        name: 'Learning & Education',
        icons: [
            { id: 'book', emoji: '📚', name: 'Books', keywords: ['study', 'learn', 'education', 'reading'] },
            { id: 'graduation', emoji: '🎓', name: 'Graduation Cap', keywords: ['education', 'degree', 'achievement', 'school'] },
            { id: 'microscope', emoji: '🔬', name: 'Microscope', keywords: ['science', 'research', 'study', 'lab'] },
            { id: 'globe', emoji: '🌍', name: 'Globe', keywords: ['geography', 'world', 'travel', 'global'] },
            { id: 'language', emoji: '🗣️', name: 'Speaking', keywords: ['language', 'communication', 'speech', 'talk'] },
            { id: 'brain', emoji: '🧠', name: 'Brain', keywords: ['thinking', 'intelligence', 'mind', 'memory'] },
            { id: 'test', emoji: '📝', name: 'Memo', keywords: ['test', 'exam', 'quiz', 'assessment'] },
            { id: 'calculator', emoji: '🧮', name: 'Calculator', keywords: ['math', 'numbers', 'calculation', 'accounting'] },
        ]
    },
    {
        name: 'Creative & Hobbies',
        icons: [
            { id: 'art', emoji: '🎨', name: 'Artist Palette', keywords: ['art', 'creative', 'paint', 'design'] },
            { id: 'music', emoji: '🎵', name: 'Musical Note', keywords: ['music', 'song', 'melody', 'audio'] },
            { id: 'camera', emoji: '📷', name: 'Camera', keywords: ['photography', 'photo', 'picture', 'capture'] },
            { id: 'guitar', emoji: '🎸', name: 'Guitar', keywords: ['music', 'instrument', 'rock', 'acoustic'] },
            { id: 'microphone', emoji: '🎤', name: 'Microphone', keywords: ['singing', 'recording', 'podcast', 'voice'] },
            { id: 'theater', emoji: '🎭', name: 'Theater Masks', keywords: ['drama', 'acting', 'performance', 'theater'] },
            { id: 'game', emoji: '🎮', name: 'Game Controller', keywords: ['gaming', 'play', 'entertainment', 'fun'] },
            { id: 'puzzle', emoji: '🧩', name: 'Puzzle Piece', keywords: ['puzzle', 'problem', 'solve', 'challenge'] },
        ]
    },
    {
        name: 'Home & Personal',
        icons: [
            { id: 'house', emoji: '🏠', name: 'House', keywords: ['home', 'family', 'personal', 'domestic'] },
            { id: 'cleaning', emoji: '🧹', name: 'Broom', keywords: ['cleaning', 'chores', 'tidy', 'housework'] },
            { id: 'cooking', emoji: '🍳', name: 'Cooking', keywords: ['cook', 'food', 'kitchen', 'meal'] },
            { id: 'shopping', emoji: '🛒', name: 'Shopping Cart', keywords: ['shopping', 'groceries', 'buy', 'store'] },
            { id: 'laundry', emoji: '👕', name: 'T-Shirt', keywords: ['laundry', 'clothes', 'washing', 'clothing'] },
            { id: 'garden', emoji: '🌱', name: 'Seedling', keywords: ['garden', 'plant', 'grow', 'nature'] },
            { id: 'pet', emoji: '🐕', name: 'Dog', keywords: ['pet', 'animal', 'care', 'companion'] },
            { id: 'gift', emoji: '🎁', name: 'Gift', keywords: ['present', 'birthday', 'celebration', 'surprise'] },
        ]
    },
    {
        name: 'Travel & Transportation',
        icons: [
            { id: 'airplane', emoji: '✈️', name: 'Airplane', keywords: ['travel', 'flight', 'vacation', 'trip'] },
            { id: 'car', emoji: '🚗', name: 'Car', keywords: ['drive', 'transport', 'vehicle', 'commute'] },
            { id: 'train', emoji: '🚆', name: 'Train', keywords: ['transport', 'travel', 'commute', 'railway'] },
            { id: 'bicycle', emoji: '🚴', name: 'Bicycle', keywords: ['bike', 'cycling', 'exercise', 'eco'] },
            { id: 'map', emoji: '🗺️', name: 'Map', keywords: ['navigation', 'location', 'direction', 'travel'] },
            { id: 'luggage', emoji: '🧳', name: 'Luggage', keywords: ['travel', 'suitcase', 'trip', 'vacation'] },
            { id: 'compass', emoji: '🧭', name: 'Compass', keywords: ['direction', 'navigation', 'explore', 'adventure'] },
            { id: 'ticket', emoji: '🎫', name: 'Ticket', keywords: ['event', 'travel', 'admission', 'pass'] },
        ]
    },
    {
        name: 'Communication & Social',
        icons: [
            { id: 'phone', emoji: '📱', name: 'Mobile Phone', keywords: ['call', 'communication', 'contact', 'mobile'] },
            { id: 'email', emoji: '📧', name: 'Email', keywords: ['message', 'communication', 'mail', 'contact'] },
            { id: 'chat', emoji: '💬', name: 'Speech Balloon', keywords: ['chat', 'message', 'talk', 'conversation'] },
            { id: 'meeting', emoji: '👥', name: 'People', keywords: ['meeting', 'team', 'group', 'social'] },
            { id: 'handshake', emoji: '🤝', name: 'Handshake', keywords: ['agreement', 'partnership', 'deal', 'cooperation'] },
            { id: 'megaphone', emoji: '📢', name: 'Megaphone', keywords: ['announcement', 'broadcast', 'marketing', 'promotion'] },
            { id: 'network', emoji: '🌐', name: 'Globe with Meridians', keywords: ['internet', 'network', 'global', 'web'] },
            { id: 'video', emoji: '📹', name: 'Video Camera', keywords: ['video', 'recording', 'meeting', 'content'] },
        ]
    },
    {
        name: 'Finance & Money',
        icons: [
            { id: 'money', emoji: '💰', name: 'Money Bag', keywords: ['money', 'finance', 'wealth', 'savings'] },
            { id: 'credit-card', emoji: '💳', name: 'Credit Card', keywords: ['payment', 'card', 'purchase', 'finance'] },
            { id: 'bank', emoji: '🏦', name: 'Bank', keywords: ['banking', 'finance', 'money', 'institution'] },
            { id: 'chart-up', emoji: '📈', name: 'Chart Increasing', keywords: ['growth', 'profit', 'investment', 'success'] },
            { id: 'piggy-bank', emoji: '🐷', name: 'Pig', keywords: ['savings', 'money', 'budget', 'finance'] },
            { id: 'receipt', emoji: '🧾', name: 'Receipt', keywords: ['expense', 'purchase', 'record', 'accounting'] },
            { id: 'coin', emoji: '🪙', name: 'Coin', keywords: ['money', 'currency', 'payment', 'finance'] },
            { id: 'safe', emoji: '🔒', name: 'Lock', keywords: ['security', 'safe', 'protection', 'secure'] },
        ]
    }
];

interface IconSelectorProps {
    selectedIcon?: string;
    onIconSelect: (icon: IconItem) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function IconSelector({ selectedIcon, onIconSelect, open, onOpenChange }: IconSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Filter icons based on search query and category
    const filteredIcons = ICON_CATEGORIES.flatMap(category => {
        if (selectedCategory !== 'all' && category.name !== selectedCategory) {
            return [];
        }

        return category.icons.filter(icon => {
            if (!searchQuery) return true;

            const query = searchQuery.toLowerCase();
            return (
                icon.name.toLowerCase().includes(query) ||
                icon.keywords.some(keyword => keyword.toLowerCase().includes(query))
            );
        });
    });

    const handleIconSelect = (icon: IconItem) => {
        onIconSelect(icon);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] bg-background">
                <DialogHeader>
                    <DialogTitle>Select an Icon</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search icons..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={selectedCategory === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory('all')}
                        >
                            All
                        </Button>
                        {ICON_CATEGORIES.map(category => (
                            <Button
                                key={category.name}
                                variant={selectedCategory === category.name ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(category.name)}
                            >
                                {category.name}
                            </Button>
                        ))}
                    </div>

                    {/* Icons Grid */}
                    <ScrollArea className="h-96">
                        <div className="grid grid-cols-8 gap-2 p-2">
                            {filteredIcons.map(icon => (
                                <Button
                                    key={icon.id}
                                    variant={selectedIcon === icon.emoji ? 'default' : 'ghost'}
                                    className="h-12 w-12 p-0 text-xl hover:bg-accent"
                                    onClick={() => handleIconSelect(icon)}
                                    title={icon.name}
                                >
                                    {icon.emoji}
                                </Button>
                            ))}
                        </div>

                        {filteredIcons.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No icons found matching your search.
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Export the icon categories for use in other components
export { ICON_CATEGORIES };