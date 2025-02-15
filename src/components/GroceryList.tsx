
import React, { useState, KeyboardEvent, useEffect } from 'react';
import { Plus, X, Edit, Check, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface GroceryItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export default function GroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    fetchItems();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error('Error fetching items: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (name: string) => {
    if (name.trim()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/auth');
          return;
        }

        const { data, error } = await supabase
          .from('grocery_items')
          .insert([{ 
            name: name.trim(),
            user_id: session.user.id
          }])
          .select()
          .single();

        if (error) throw error;
        
        setItems([data, ...items]);
        setInputValue('');
        toast.success('Item added to list');
      } catch (error: any) {
        toast.error('Error adding item: ' + error.message);
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddItem(inputValue);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(items.filter(item => item.id !== id));
      toast.success('Item removed from list');
    } catch (error: any) {
      toast.error('Error deleting item: ' + error.message);
    }
  };

  const startEdit = (item: GroceryItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const handleEdit = async (id: string) => {
    if (editValue.trim()) {
      try {
        const { error } = await supabase
          .from('grocery_items')
          .update({ name: editValue.trim() })
          .eq('id', id);

        if (error) throw error;

        setItems(items.map(item => 
          item.id === id 
            ? { ...item, name: editValue.trim() }
            : item
        ));
        setEditingId(null);
        toast.success('Item updated');
      } catch (error: any) {
        toast.error('Error updating item: ' + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error: any) {
      toast.error('Error signing out: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-light text-gray-800 mb-2">Grocery List</h2>
          <p className="text-sm text-gray-500">Add items to your shopping list</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-primary transition-colors"
          title="Sign out"
        >
          <LogOut size={20} />
        </button>
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
    </div>
  );
}
