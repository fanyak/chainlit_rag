import { escapeHtml } from '@/lib/utils';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

const PLACEHOLDER_TEXT =
  'Επιλέξτε μία ερώτηση από επάνω ή πληκτρολογήστε εδώ νέα ερώτηση...';

export default function SearchBox({
  quickQuery,
  onReset
}: {
  quickQuery: string;
  onReset: () => void;
}) {
  const [quickQueryHtml, setQuickQueryHtml] = useState<{ __html: string }>();
  const [controller, setController] = useState(new AbortController());
  const [inputText, setInputText] = useState('');

  const inputRef = useRef<HTMLDivElement>(null);

  function setDisplayText(
    text: string,
    showCaret: boolean = true
  ): { __html: string } {
    const safe = escapeHtml(text);
    const markup = {
      __html: showCaret ? safe + '<span id="demoCaret"></span>' : safe
    };
    return markup;
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const inputValue = (e.currentTarget.textContent || '').trim();
    setInputText(escapeHtml(inputValue));
  };

  const handleFocus = (_e: React.FocusEvent<HTMLDivElement>) => {
    // if nothing has been typed yet, remove the placeholder text on focus
    if (!inputText.length) {
      setQuickQueryHtml(setDisplayText('', false));
    }
    // reset the selected quickQuery so that it can be re-selected
    if (quickQuery.length) {
      onReset(); // this will re-render the parent component with empty quickQuery
    }
  };

  useEffect(() => {
    //set up function
    // after re-render, if dependency changed the setup runs with
    // the latest state values and props

    // The rule of thumb is that the user shouldn’t be able to distinguish
    // between the setup being called once (as in production)
    // and a setup → cleanup → setup sequence (as in development)

    // short circuit if nothing typed or queried, and on reset
    if (!quickQuery.length) {
      if (!inputText.length) {
        setQuickQueryHtml(setDisplayText(PLACEHOLDER_TEXT, false));
      } else {
        setQuickQueryHtml(setDisplayText(inputText, false));
        inputRef.current?.focus();
      }
      return;
    }
    let ignore = false;

    // this will update the value of controller on the next render!
    setController(new AbortController());

    // firnst initial paint start over on the next render
    setQuickQueryHtml(setDisplayText('', false));
    setInputText('');

    // this will use the current value of controller instance
    // this will create new re-renders by changing the state
    async function typeText(speed: number, signal: AbortSignal) {
      // REF: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal#implementing_an_abortable_api

      //The promise is rejected immediately if the signal is already aborted,
      // or if the abort event is detected.
      // Otherwise it completes normally and then resolves the promise.
      await new Promise<void>(
        (resolve: (value: void) => void, reject: (reason?: any) => any) => {
          // If the signal is already aborted, immediately reject the promise.
          if (signal.aborted) {
            reject(signal.reason);
            return;
          }
          // race conditions
          if (ignore) {
            reject('ignore');
            return;
          }
          // Perform the main purpose of the API
          // Call resolve(result) when done.
          let i = 0;
          const timer = window.setInterval(() => {
            i++;
            const typeText = quickQuery.slice(0, i);
            setQuickQueryHtml(setDisplayText(typeText, true));
            // help with button UI
            setInputText(typeText);
            if (i >= quickQuery.length) {
              window.clearInterval(timer);
              window.setTimeout(() => {
                setQuickQueryHtml(setDisplayText(quickQuery, false));
                resolve();
              }, 500);
            }
          }, speed);

          // Watch for 'abort' signals
          // addEventListeners are tasked in the macrotask queue
          // so the console.log will appear before the rejected promise is handled
          // with .catch() below. Catch will only be called
          // if the promise is rejected while not yet resolved
          signal.addEventListener('abort', () => {
            window.clearInterval(timer);
            reject(signal.reason);
            console.log('Typing aborted');
          });
        }
      );
    }

    // Each time when an async function is called, it returns a new Promise
    // which will be resolved with the value returned by the async function,
    // or rejected if an exception is uncaught within the async function.
    // new microtask added to the JavaScript event loop
    typeText(60, controller.signal)
      .catch((e) => {
        // catch the uncaught rejection inside the async function
        // this will be called if the promise is rejected before being resolved
        console.log('caught abort signal in unresolved promise', e);
        // setQuickQueryHtml(setDisplayText(quickQuery, false));
      })
      .finally(() => {
        // if the promise resolves,
        // then in any case abort the controller.
        controller.abort();
      });

    // cleanup function to abort on unmount
    // this runs with the previous state every time quickQuery changes
    return () => {
      ignore = true;
      // this doesnt' change the state!!!
      // it just aborts the previous controller from last render
      controller.abort();
    };
  }, [quickQuery]);

  return (
    <>
      <form
        className="search-box"
        // onSubmit="return false;"
        aria-label="Quick question"
      >
        <label htmlFor="quickQuery" className="sr-only">
          Ερώτηση αναζήτησης
        </label>
        <div
          ref={inputRef}
          id="quickQuery"
          contentEditable="true"
          aria-label="Ερώτηση"
          onKeyUp={handleKeyUp}
          onFocus={handleFocus}
          className={clsx(
            'text-sm',
            inputText.length ? '' : 'opacity-70 italic'
          )}
          dangerouslySetInnerHTML={quickQueryHtml}
        />
        {/* <input
          id="quickQuery"
          value={quickQuery}
          onChange={(e) => setQuickQuery(e.target.value)}
          aria-label="Ερώτηση"
        /> */}
        <Button
          variant={inputText.length ? 'front' : 'ghost'}
          size="sm"
          className="small"
          type="button"
          id="askBtn"
          aria-label="Ρώτα"
        >
          Ρώτα
        </Button>
      </form>
      {/* <div
        style={{
          marginTop: '12px',
          color: 'var(--muted)',
          fontSize: '0.75rem'
        }}
      >
        Παραδείγματα ερωτήσεων για να ξεκινήσετε. Επιλέξτε ή πληκτρολογήστε και
        πατήστε "Ρώτα".
      </div> */}
    </>
  );
}
