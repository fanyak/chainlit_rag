import { escapeHtml } from '@/lib/utils';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

export default function SearchBox({ quickQuery }: { quickQuery: string }) {
  const [quickQueryHtml, setQuickQueryHtml] = useState<{ __html: string }>();
  const [controller, setController] = useState(new AbortController());

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

  useEffect(() => {
    let ignore = false;
    console.log('start over with clean slate');
    // initial paint
    setQuickQueryHtml(setDisplayText('', false));
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
            setQuickQueryHtml(setDisplayText(quickQuery.slice(0, i), true));
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
    // this will update the value of controller to a new instance
    setController(new AbortController());
    // this will use the latest controller instance

    // Each time when an async function is called, it returns a new Promise
    // which will be resolved with the value returned by the async function,
    // or rejected with an exception uncaught within the async function.
    // new microtask added to the JavaScript event loop
    typeText(60, controller.signal).catch((e) => {
      // catch the uncaught rejection inside the async function
      // this will be called if the promise is rejected before being resolved
      console.log('caught abort signal in unresolved promise', e);
      // setQuickQueryHtml(setDisplayText(quickQuery, false));
    });

    // cleanup function to abort on unmount
    // this runs every time quickQuery changes
    return () => {
      ignore = true;
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
          id="quickQuery"
          contentEditable="true"
          aria-label="Ερώτηση"
          className="text-sm"
          dangerouslySetInnerHTML={quickQueryHtml}
        />
        {/* <input
          id="quickQuery"
          value={quickQuery}
          onChange={(e) => setQuickQuery(e.target.value)}
          aria-label="Ερώτηση"
        /> */}
        <Button
          variant="ghost"
          size="sm"
          className="small ghost"
          type="button"
          id="askBtn"
          aria-label="Ρώτα"
        >
          Ρώτα
        </Button>
      </form>
      <div
        style={{
          marginTop: '12px',
          color: 'var(--muted)',
          fontSize: '0.75rem'
        }}
      >
        Παραδείγματα ερωτήσεων για να ξεκινήσετε. Επιλέξτε ή πληκτρολογήστε και
        πατήστε "Ρώτα".
      </div>
    </>
  );
}
