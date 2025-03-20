setTimeout(() => {
    document.querySelectorAll(".flash-message").forEach(el => el.remove());
  }, 10000); 

  async function getAIResponse() {
    const prompt = document.getElementById("aiPrompt").value;
    const res = await fetch(`/get-ai-help?prompt=${encodeURIComponent(prompt)}`);
    const data = await res.json();
    document.getElementById("aiResponse").innerText = data.response;
}
