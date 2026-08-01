import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

/**
 * Autocomplétion typeahead pour paroisses / communautés.
 */
export function useAutocomplete({ endpoint, params = {}, minChars = 1, delay = 250 }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (query.trim().length < minChars) {
      setSuggestions([]);
      setOpen(false);
      return undefined;
    }

    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(endpoint, {
          params: { search: query, ...params },
        });
        setSuggestions(data.data || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer.current);
  }, [query, endpoint, minChars, delay, JSON.stringify(params)]);

  function select(item) {
    setQuery(item.nom);
    setOpen(false);
    return item;
  }

  function close() {
    setOpen(false);
  }

  return { query, setQuery, suggestions, loading, open, select, close, setOpen };
}
