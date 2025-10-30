import clsx from 'clsx';
import { Dispatch, Fragment, SetStateAction, useEffect, useState } from 'react';

function BotSim() {
  const messages: string[] = [
    'Χαίρεται! Είμαι ο Φορολογικός Βοηθός',
    'Είμαι bot εκπαιδευμένο ειδικά για να απαντά σε ερωτήσεις σχετικά με την ελληνική φορολογική νομοθεσία.',
    'Πώς μπορώ να σας βοηθήσω σήμερα;'
  ];

  const [controller, setController] = useState<AbortController>(
    new AbortController()
  );

  const backs: string[] = messages.map(() => '');
  const [text1, setText1] = useState<string>('');
  const [text2, setText2] = useState<string>('');
  const [text3, setText3] = useState<string>('');
  const [text1Done, setText1Done] = useState<boolean>(false);
  const [text2Done, setText2Done] = useState<boolean>(false);
  const [text3Done, setText3Done] = useState<boolean>(false);

  function setDisplayText(text: string, showCaret: boolean = true): string {
    return showCaret ? text + '<span id="demoCaret"></span>' : text;
  }

  const textArray = [text1, text2, text3];
  const functionsArray = [setText1, setText2, setText3];
  const textDoneArray = [text1Done, text2Done, text3Done];
  const setTextDoneArray = [setText1Done, setText2Done, setText3Done];

  useEffect(() => {
    let ignore = false;
    setController(new AbortController());

    function typeText(
      speed: number,
      signal: AbortSignal
    ): (index: number) => Promise<void> {
      return (index) => {
        const text = messages[index];
        const fn: Dispatch<SetStateAction<string>> = functionsArray[index];
        // const setDone: Dispatch<SetStateAction<boolean>> =
        //   setTextDoneArray[index];
        return new Promise<void>(
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
              backs[index] = text.slice(0, i);
              fn(setDisplayText(backs[index], true));
              if (i >= text.length) {
                window.clearInterval(timer);
                window.setTimeout(() => {
                  fn(setDisplayText(text, false));
                  //setDone(true);
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
      };
    }

    async function* syncRunner(): AsyncGenerator<void, void, unknown> {
      /** generator function to run the typing animation
       * @returns {AsyncGenerator<void, void, unknown>}
       * A generator object that conforms to the Iterator Protocol
       * meaning that it has a next() method
       * next() returns a promise fulfilling to an iterator result object
       * Yields after each message is typed out
       */
      const promise: (index: number) => Promise<void> = typeText(
        60,
        controller!.signal
      );
      let i = 0;
      // keep track of the promises here to handle errors from abort signals
      while (i < messages.length) {
        yield promise(i);
        i++;
      }
    }
    // this will be called when the component mounts
    (async () => {
      // Generator object the conforms to both the async iterable and the async Iterator Protocol
      // iter.next() returns a promise fulfilling to an iterator result object
      const iter: AsyncGenerator<void, void, unknown> = syncRunner();

      // manuall iterate through the async generator's returned promises
      // iter
      //   .next()
      //   .then(() => iter.next())
      //   .then(() => iter.next());

      // since iter is also an async iterable, we can use for await...of
      try {
        // for await (const _ of iter) {
        //   // do nothing
        // }
        await Array.fromAsync(iter, (_, index) => {
          const setDone: Dispatch<SetStateAction<boolean>> =
            setTextDoneArray[index];
          setDone(true);
        });
      } catch (error) {
        console.error('yielded rejected or aborted promise', error);
      }
    })();

    // cleanup function to abort on unmount
    // this runs every time effect dependencies change
    return () => {
      console.log('cleanup called');
      ignore = true;
      controller?.abort();
    };
  }, []); // empty dependency array to run only once on mount

  return (
    // Updating state with setText{i} requests another render with the new state value
    <div style={{ minHeight: '180px' }}>
      {messages.map((msg, index) => (
        <Fragment key={index}>
          {/* {textArray[index] && ( */}
          <div
            className={clsx(
              'w-max min-w-[8rem] min-h-10 mb-2 px-3 py-2.5 relative rounded-2xl max-w-[70%] flex-grow-0 text-sm',
              'transition-all duration-500',
              textDoneArray[index]
                ? 'ml-auto bg-accent text-white'
                : 'ml-3 bg-gray-50/80 font-weight-medium'
            )}
            style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
          >
            <div className="flex flex-col">
              <div className="message-content w-full flex flex-col gap-2">
                <div className="flex flex-col">
                  <div className="prose lg:prose-xl">
                    <div
                      className="whitespace-pre-wrap break-words"
                      role="article"
                      dangerouslySetInnerHTML={{ __html: textArray[index] }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* )} */}
        </Fragment>
      ))}
    </div>
  );
}

export default BotSim;
