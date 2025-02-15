
import React, { useState, KeyboardEvent } from 'react';
import { Plus, X, Edit, Check } from 'lucide-react';
import { toast } from 'sonner';

interface GroceryItem {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function GroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAddItem = (name: string) => {
    if (name.trim()) {
      const newItem: GroceryItem = {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setItems([...items, newItem]);
      setInputValue('');
      toast.success('Item added to list');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddItem(inputValue);
    }
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success('Item removed from list');
  };

  const startEdit = (item: GroceryItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const handleEdit = (id: string) => {
    if (editValue.trim()) {
      setItems(items.map(item => 
        item.id === id 
          ? { ...item, name: editValue.trim(), updatedAt: new Date() }
          : item
      ));
      setEditingId(null);
      toast.success('Item updated');
    }
  };

  const handleSave = () => {
    if (items.length === 0) {
      toast.error('Please add at least one item to your list');
      return;
    }
    // Here we would normally save to the database
    toast.success('Grocery list saved successfully!');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-light text-gray-800 mb-2">Grocery List</h2>
        <p className="text-sm text-gray-500">Add items to your shopping list</p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add an item..."
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
        />
        <button
          onClick={() => handleAddItem(inputValue)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-200 animate-slide-in"
          >
            {editingId === item.id ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-primary"
                  autoFocus
                />
                <button
                  onClick={() => handleEdit(item.id)}
                  className="ml-2 p-1 text-green-500 hover:text-green-600"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">{item.name}</span>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1 text-gray-400 hover:text-primary transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <button
          onClick={handleSave}
          className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity duration-200 font-medium"
        >
          Next
        </button>
      )}
    </div>
  );
}
