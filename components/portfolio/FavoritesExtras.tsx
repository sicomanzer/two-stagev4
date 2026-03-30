import React, { useState, useRef, useEffect } from 'react';
import { TAG_OPTIONS, getTagStyle } from './FavoritesToolbar';
import { X, Plus, Check } from 'lucide-react';

interface InlineNotesProps {
  itemId: number;
  notes: string | null;
  onSave: (id: number, notes: string) => void;
}

export function InlineNotes({ itemId, notes, onSave }: InlineNotesProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    onSave(itemId, value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-start gap-2 mt-2 animate-in fade-in duration-200">
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } if (e.key === 'Escape') setEditing(false); }}
          placeholder="เหตุผลสั้นๆ เช่น 'รอ Q2', 'D/E ลดต่อเนื่อง'..."
          rows={2}
          className="flex-1 px-3 py-1.5 text-xs border border-emerald-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none bg-white"
        />
        <button onClick={handleSave} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex-shrink-0">
          <Check size={14} />
        </button>
        <button onClick={() => { setValue(notes || ''); setEditing(false); }} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`mt-2 text-left w-full text-xs px-3 py-1.5 rounded-lg border transition-all ${
        notes
          ? 'bg-amber-50/60 border-amber-200 text-amber-800 hover:bg-amber-100/80'
          : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
      }`}
    >
      {notes ? (
        <span className="line-clamp-2">💡 {notes}</span>
      ) : (
        <span className="flex items-center gap-1">
          <Plus size={12} /> เพิ่ม thesis สั้นๆ...
        </span>
      )}
    </button>
  );
}

// ─── Tags Picker ─────────────
interface TagsPickerProps {
  itemId: number;
  tags: string[];
  onSave: (id: number, tags: string[]) => void;
}

export function TagsPicker({ itemId, tags, onSave }: TagsPickerProps) {
  const [open, setOpen] = useState(false);

  const toggle = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    onSave(itemId, next);
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1">
        {tags.map(tag => (
          <span key={tag} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTagStyle(tag)}`}>
            {tag}
            <button onClick={() => toggle(tag)} className="hover:opacity-60 ml-0.5"><X size={10} /></button>
          </span>
        ))}
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
        >
          <Plus size={10} /> Tag
        </button>
      </div>

      {open && (
        <div className="mt-2 p-2 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-wrap gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {TAG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                tags.includes(opt.value)
                  ? `${opt.color} ring-2 ring-offset-1 ring-emerald-400`
                  : `${opt.color} opacity-60 hover:opacity-100`
              }`}
            >
              {tags.includes(opt.value) ? '✓ ' : ''}{opt.value}
            </button>
          ))}
          <button onClick={() => setOpen(false)} className="text-[10px] text-slate-400 hover:text-slate-600 ml-auto px-2">Done</button>
        </div>
      )}
    </div>
  );
}
