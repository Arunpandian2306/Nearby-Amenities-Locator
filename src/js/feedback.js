(function () {
  emailjs.init("poIl8fAAJa9-Xq3D9");
})();

document.getElementById("contactForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  const nameRegex = /^[A-Za-z\s]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const messageRegex = /^[A-Za-z0-9\s.,!?]+$/;

  if (!nameRegex.test(name)) {
    alert("Name must only contain letters and spaces.");
    return;
  }

  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  if (message.length < 15) {
    alert("Message must be at least 15 characters long.");
    return;
  }

  if (!messageRegex.test(message)) {
    alert("Message contains invalid characters.");
    return;
  }

  const fullMessage = `Name: ${name}\nEmail: ${email}\n\nMessage: ${message}`;

  emailjs
    .send("service_ed7w4qc", "template_5t5h3ln", {
      name: name,
      email: email,
      message: fullMessage,
    })
    .then(
      function (response) {
        console.log("Email sent successfully:", response);
        alert("Message sent successfully!");
        document.getElementById("contactForm").reset();
      },
      function (error) {
        console.error("Email send failed:", error);
        alert("Failed to send the message. Please try again later.");
      }
    );
});

function goBack() {
  window.location.href = "../../index.html";
}
