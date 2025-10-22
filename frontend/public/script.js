function setupLoginpg() {
  // const loginBtn = document.getElementById('loginBtn');
  // const openChatBtn = document.getElementById('openChatBtn');
  // const chatFrame = document.getElementById('chatFrame');
  const samples = document.getElementById('samples');
  const quickQuery = document.getElementById('quickQuery');
  const askBtn = document.getElementById('askBtn');
  // const sessionStatus = document.getElementById('sessionStatus');
  // const userName = document.getElementById('userName');
  // const langBtn = document.getElementById('langBtn');

  // async function checkSession() {
  //   const s = await getJson('/auth/session');
  //   if (s && s.logged_in) {
  //     sessionStatus.textContent = 'Συνδεδεμένος';
  //     openChatBtn.disabled = false;
  //     loginBtn.textContent = 'Αποσύνδεση';
  //     userName.textContent = s.user || '—';
  //   } else {
  //     sessionStatus.textContent = 'Αποσύνδεση';
  //     openChatBtn.disabled = true;
  //     loginBtn.textContent = 'Σύνδεση';
  //     userName.textContent = '—';
  //   }
  // }
  let controller = null;

  samples?.addEventListener('click', async (ev) => {
    const t = ev.target;
    if (t.classList.contains('chip')) {
      const text = t.textContent.trim();
      //quickQuery.value = text;
      if (controller) controller.abort();
      controller = new AbortController();
      try {
        await typeText('quickQuery', text, 60, controller.signal);
        controller = null;
      } catch (e) {
        if (e.name === 'AbortError') {
          console.log('Typing aborted');
        } else {
          console.error('Error typing text:', e);
        }
      }
    }
  });

  askBtn?.addEventListener('click', () => {
    const q = quickQuery.value.trim();
    console.log('Question:', q);
    if (!q) return;
  });
  // loginBtn?.addEventListener('click', onLogin);
  // openChatBtn?.addEventListener('click', openChat);

  // // demo typing logic
  // const playDemoBtn = document.getElementById('playDemoBtn');
  // const recordedDemoBtn = document.getElementById('recordedDemoBtn');
  // const sendDemoBtn = document.getElementById('sendDemoBtn');
  // const demoInputDisplay = document.getElementById('demoInputDisplay');
  // const demoVideo = document.getElementById('demoVideo');
  // const demoQuestion = 'Πώς υποβάλλεται ο πίνακας προσωπικού;';

  function setDisplayText(targetElement, text, showCaret = true) {
    targetElement =
      typeof targetElement === 'string'
        ? document.getElementById(targetElement)
        : targetElement;
    targetElement.innerHTML = '';
    const tn = document.createTextNode(text);
    targetElement.appendChild(tn);
    if (showCaret) {
      const caret = document.createElement('span');
      caret.id = 'demoCaret';
      targetElement.appendChild(caret);
    }
  }

  function typeText(targetElement, text, speed = 60, signal) {
    setDisplayText(targetElement, '', true);
    let i = 0;
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const timer = setInterval(() => {
        i++;
        setDisplayText(targetElement, text.slice(0, i), true);
        if (i >= text.length) {
          clearInterval(timer);
          setTimeout(() => {
            setDisplayText(targetElement, text, false);
            resolve();
          }, 300);
        }
      }, speed);
      // Watch for 'abort' signals
      signal.addEventListener('abort', () => {
        // Stop the main operation
        // Reject the promise with the abort reason.
        clearInterval(timer);
        reject(signal.reason);
      });
    });
  }
}
function mutationObserverCallback(mutationsList, observer) {
  // var buttons = document.querySelectorAll('button');
  const samples = document.getElementById('samples');
  const quickQuery = document.getElementById('quickQuery');
  if (samples && quickQuery) {
    setupLoginpg();
    observer.disconnect();
  }
}

if (window.location.href.includes('login')) {
  const observer = new MutationObserver(mutationObserverCallback);
  const config = { childList: true, subtree: true };
  observer.observe(document.body, config);
}

// playDemoBtn?.addEventListener('click', async () => {
//   demoVideo?.style.display = 'none';
//   demoVideo?.pause();
//   playDemoBtn?.disabled = true;
//   sendDemoBtn?.disabled = true;
//   await typeText(demoInputDisplay, demoQuestion, 60);
//   playDemoBtn?.disabled = false;
//   sendDemoBtn?.disabled = false;
// });

// recordedDemoBtn?.addEventListener('click', () => {
//   if (demoVideo.style.display === 'none') {
//     demoVideo.style.display = '';
//     demoVideo.play().catch(() => {});
//   } else {
//     demoVideo.pause();
//     demoVideo.style.display = 'none';
//   }
// });

// sendDemoBtn?.addEventListener('click', async () => {
//   const text = demoInputDisplay.textContent?.trim();
//   if (!text) return;
//   if (!chatFrame.src) {
//     openChat();
//     await new Promise((r) => setTimeout(r, 600));
//   }
//   sendDemoBtn.classList.add('sending');
//   try {
//     chatFrame.contentWindow.postMessage(
//       { type: 'chat:ask', question: text },
//       '*'
//     );
//   } catch (e) {}
//   setTimeout(() => sendDemoBtn.classList.remove('sending'), 600);
// });

// langBtn?.addEventListener('click', () => {
//   if (document.documentElement.lang === 'el') {
//     document.documentElement.lang = 'en';
//     alert('Switch to English not implemented server-side');
//   } else {
//     document.documentElement.lang = 'el';
//     alert('Η αλλαγή γλώσσας απαιτεί υποστήριξη από τον server.');
//   }
// });
