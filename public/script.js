const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  input.value = '';

  // Kirim ke backend Express API (Gemini)
  fetch('/generate-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: userMessage }),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      appendMessage('bot', data.output || '(No response from Gemini)');
    })
    .catch(error => {
      appendMessage('bot', 'Error: ' + error.message);
    });
});

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}
