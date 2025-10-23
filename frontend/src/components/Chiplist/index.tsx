import { useEffect, useState } from 'react';

import ButtonChip from '../ButtonChip';
import SearchBox from './SearchBox';

type QueryItem = string | { id?: number | string; text?: string };

const fetcher = (signal: AbortSignal): Promise<QueryItem[]> => {
  const request: Request = new Request('/public/sample_questions.json', {
    signal
  });
  return fetch(request)
    .then((response) => response.json())
    .then((data) => data?.questions || [])
    .catch((err) => {
      if (err.name === 'AbortError') return [];
      throw err;
    });
};

export default function ChipList() {
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickQuery, setQuickQuery] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    // set up function to fetch data
    async function startFetching() {
      setLoading(true);
      try {
        const result = await fetcher(controller.signal);
        if (!mounted) return;
        setQueries(result);
      } catch (err) {
        console.error('Error fetching sample questions:', err);
        setError('Failed to load sample questions');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    startFetching();

    // cleanup function to abort fetch on unmount
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  if (loading) {
    // Render a spinner or placeholder while loading
    return (
      <div className="spinner" aria-busy="true">
        Loading samples…
      </div>
    );
  }

  if (error) {
    return <div className="muted">Could not load samples</div>;
  }

  if (queries.length === 0) {
    return <div className="muted">No samples available</div>;
  }

  return (
    <>
      {queries.map((question, index) => {
        const text =
          typeof question === 'string' ? question : question?.text ?? '';
        const key =
          typeof question === 'object' && question?.id != null
            ? String(question.id)
            : text.trim() || String(index);
        return (
          <ButtonChip
            key={key}
            index={index}
            text={text}
            onSelect={setQuickQuery}
          />
        );
      })}
      <SearchBox quickQuery={quickQuery} />
    </>
  );
}
