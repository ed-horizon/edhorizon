
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateLead } from "@/app/(dashboard)/sales/actions";
import { useState } from "react";
import { Loader2, Edit2, Check, X, Mail, Phone } from "lucide-react";

export default function LeadCard({ lead }: { lead: any }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editData, setEditData] = useState({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        value: lead.value || 0,
        class: lead.class || "",
    });

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData("leadId", lead.id);
        e.dataTransfer.effectAllowed = "move";
        // Visual feedback for dragging
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "0.5";
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "1";
    };

    const handleSave = async () => {
        setIsLoading(true);
        const result = await updateLead(lead.id, editData);
        setIsLoading(false);
        if (result.success) {
            setIsEditing(false);
        } else {
            alert("Error: " + result.error);
        }
    };

    if (isEditing) {
        return (
            <Card className="shadow-md border-indigo-500 animate-in fade-in zoom-in duration-200">
                <CardContent className="p-3 space-y-2">
                    <Input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Lead Name"
                        className="h-8 text-xs rounded-md"
                        autoFocus
                    />
                    <Input
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        placeholder="Email"
                        className="h-8 text-xs rounded-md"
                    />
                    <Input
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        placeholder="Phone"
                        className="h-8 text-xs rounded-md"
                    />
                    <Input
                        value={editData.class}
                        onChange={(e) => setEditData({ ...editData, class: e.target.value })}
                        placeholder="Class/Grade"
                        className="h-8 text-xs rounded-md"
                    />
                    <Input
                        type="number"
                        value={editData.value}
                        onChange={(e) => setEditData({ ...editData, value: parseFloat(e.target.value) || 0 })}
                        placeholder="Value"
                        className="h-8 text-xs rounded-md"
                    />
                    <div className="flex justify-end gap-1 pt-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setIsEditing(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={handleSave} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="group shadow-sm border-muted-foreground/10 hover:border-indigo-400/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing bg-card rounded-xl overflow-hidden"
        >
            <CardContent className="p-3 space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-foreground truncate leading-tight uppercase tracking-tight">
                            {lead.name}
                        </p>
                        {lead.class && (
                            <span className="text-[9px] text-muted-foreground/80 font-bold block mt-0.5 uppercase tracking-wider">
                                {lead.class}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded text-muted-foreground hover:text-indigo-600"
                    >
                        <Edit2 size={12} />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600">
                    <span className="opacity-70">$</span>
                    {lead.value.toLocaleString()}
                </div>

                <div className="space-y-1">
                    {lead.email && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                            <Mail size={10} className="shrink-0 opacity-50" />
                            {lead.email}
                        </div>
                    )}
                    {lead.phone && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                            <Phone size={10} className="shrink-0 opacity-50" />
                            {lead.phone}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
