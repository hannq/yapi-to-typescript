const btnEle = document.getElementById('save-btn');
const originInputEle = document.getElementById('origin-input');

btnEle.addEventListener('click', async (e) => {
  e.preventDefault();
  const origin = originInputEle.value;
  const isOk = await chrome.permissions.request({ origins: [origin] });
})