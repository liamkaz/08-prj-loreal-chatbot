/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Cloudflare Worker URL - replace with your actual Worker URL
const CLOUDFLARE_WORKER_URL =
  "https://openai-worker.liam-kaznelson.workers.dev";

// System prompt for L'Oreal product assistant
const SYSTEM_PROMPT =
  "You are a helper designed to discuss L'Oreal products with the user.";

// Typing speed in milliseconds per character
const TYPING_SPEED = 30;
// Extra pause after punctuation marks (in milliseconds)
const PUNCTUATION_PAUSE = 200;

// Array to store conversation history for the AI
let conversationHistory = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

// Track if user is at bottom of chat (for auto-scroll behavior)
let userAtBottom = true;
// Track if AI is currently responding (to disable input)
let isAiResponding = false;

/* Helper function to check if user is scrolled to bottom */
function isUserAtBottom() {
  const threshold = 50; // Allow 50px tolerance
  return (
    chatWindow.scrollTop + chatWindow.clientHeight >=
    chatWindow.scrollHeight - threshold
  );
}

/* Helper function to scroll to bottom only if user was already at bottom */
function autoScrollIfAtBottom() {
  if (userAtBottom) {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

// Listen for scroll events to track user position
chatWindow.addEventListener("scroll", () => {
  userAtBottom = isUserAtBottom();
});

// Clear initial message and prepare chat window
chatWindow.innerHTML = "";
addMessage("👋 Hello! How can I help you today?", "ai");

/* Add message to chat window with sender label */
function addMessage(content, sender, useTypewriter = false, userPrompt = null) {
  // Create the outer message container
  const messageDiv = document.createElement("div");
  messageDiv.className = `msg ${sender}`;

  // Create the sender label element
  const labelDiv = document.createElement("div");
  labelDiv.className = "sender-label";
  // Set the appropriate label text based on sender type
  labelDiv.textContent = sender === "user" ? "You" : "L'Oreal HelperBot";

  // Create the inner bubble element that holds the message text
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble";

  // For AI messages with user prompt, create separate divs
  if (sender === "ai" && userPrompt) {
    // Create div for user prompt (shows immediately)
    const promptDiv = document.createElement("div");
    promptDiv.className = "user-prompt";
    promptDiv.innerHTML = marked
      .parse(`**Prompt:** ${userPrompt}`)
      .replace(/^<p>|<\/p>\n?$/g, "");

    // Create div for AI response (will have typewriter effect)
    const responseDiv = document.createElement("div");
    responseDiv.className = "ai-response";

    // Add both divs to the bubble
    bubbleDiv.appendChild(promptDiv);
    bubbleDiv.appendChild(responseDiv);

    // Add message structure to chat
    messageDiv.appendChild(labelDiv);
    messageDiv.appendChild(bubbleDiv);
    chatWindow.appendChild(messageDiv);

    // Update scroll tracking
    userAtBottom = true;
    autoScrollIfAtBottom();

    if (useTypewriter) {
      // Apply typewriter effect only to the AI response div
      const htmlContent = marked.parse(content).replace(/^<p>|<\/p>\n?$/g, "");
      typeMessageHTML(responseDiv, htmlContent);
    } else {
      // Display AI response immediately
      responseDiv.innerHTML = marked
        .parse(content)
        .replace(/^<p>|<\/p>\n?$/g, "");
    }

    return; // Exit early since we handled the AI message with prompt
  }

  // Handle regular messages (user messages or AI messages without user prompt)
  if (sender === "ai") {
    // Convert Markdown to HTML for AI messages
    const htmlContent = marked.parse(content).replace(/^<p>|<\/p>\n?$/g, "");

    if (useTypewriter) {
      // Start with empty content for typewriter effect
      bubbleDiv.innerHTML = "";
    } else {
      // Display HTML content immediately
      bubbleDiv.innerHTML = htmlContent;
    }

    // Add message structure to chat
    messageDiv.appendChild(labelDiv);
    messageDiv.appendChild(bubbleDiv);
    chatWindow.appendChild(messageDiv);

    // Update scroll tracking
    userAtBottom = true;
    autoScrollIfAtBottom();

    if (useTypewriter) {
      // Apply typewriter effect to the entire bubble
      typeMessageHTML(bubbleDiv, htmlContent);
    }
  } else {
    // For user messages, use plain text
    bubbleDiv.textContent = content;

    // Add message structure to chat
    messageDiv.appendChild(labelDiv);
    messageDiv.appendChild(bubbleDiv);
    chatWindow.appendChild(messageDiv);

    // Update scroll tracking
    userAtBottom = true;
    autoScrollIfAtBottom();
  }
}

/* HTML-aware typewriter effect for formatted text */
function typeMessageHTML(element, htmlContent) {
  // Create a temporary element to parse the HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;

  // Get the plain text content for timing the typewriter effect
  const plainText = tempDiv.textContent || tempDiv.innerText;
  let currentIndex = 0;

  // Start with the basic HTML structure to preserve spacing
  // This ensures line breaks appear immediately
  const initialStructure = getInitialHTMLStructure(htmlContent);
  element.innerHTML = initialStructure;

  // Create an interval that reveals text character by character
  const typingInterval = setInterval(() => {
    // Get the portion of text we want to show
    const textToShow = plainText.substring(0, currentIndex + 1);

    // Update the HTML content to show only the characters we want
    element.innerHTML = getPartialHTML(htmlContent, textToShow);

    // Get the character we just added for punctuation checking
    const currentChar = plainText[currentIndex];

    currentIndex++;

    // Auto-scroll only if user is at bottom
    autoScrollIfAtBottom();

    // Stop when we've typed the entire message
    if (currentIndex >= plainText.length) {
      clearInterval(typingInterval);
      // Ensure final HTML is complete
      element.innerHTML = htmlContent;
      return;
    }

    // Check if current character needs a pause
    const isPunctuation = [".", ",", "!", "?"].includes(currentChar);

    if (isPunctuation) {
      // Clear current interval and pause
      clearInterval(typingInterval);

      // Resume after punctuation pause
      setTimeout(() => {
        typeMessageHTMLContinue(element, htmlContent, plainText, currentIndex);
      }, PUNCTUATION_PAUSE);
    }
  }, TYPING_SPEED);
}

/* Continue HTML typewriter effect after punctuation pause */
function typeMessageHTMLContinue(element, htmlContent, plainText, startIndex) {
  let currentIndex = startIndex;

  const typingInterval = setInterval(() => {
    const textToShow = plainText.substring(0, currentIndex + 1);
    element.innerHTML = getPartialHTML(htmlContent, textToShow);

    const currentChar = plainText[currentIndex];
    currentIndex++;

    // Auto-scroll only if user is at bottom
    autoScrollIfAtBottom();

    // Stop when we've typed the entire message
    if (currentIndex >= plainText.length) {
      clearInterval(typingInterval);
      element.innerHTML = htmlContent;
      return;
    }

    const isPunctuation = [".", ",", "!", "?"].includes(currentChar);

    if (isPunctuation) {
      clearInterval(typingInterval);
      setTimeout(() => {
        typeMessageHTMLContinue(element, htmlContent, plainText, currentIndex);
      }, PUNCTUATION_PAUSE);
    }
  }, TYPING_SPEED);
}

/* Helper function to get initial HTML structure with spacing preserved */
function getInitialHTMLStructure(htmlContent) {
  // Create a temporary element to parse the HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;

  // Clone the structure but remove all text content
  // This preserves paragraph breaks and other spacing elements
  function cloneStructureOnly(sourceNode) {
    const clone = document.createElement("div");

    for (const child of sourceNode.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        // For elements like <p>, <strong>, etc., create empty versions
        const elementClone = child.cloneNode(false);

        // Recursively process children but keep structure
        if (child.childNodes.length > 0) {
          const childStructure = cloneStructureOnly(child);
          if (childStructure.innerHTML.trim() !== "") {
            elementClone.appendChild(childStructure);
          }
        }

        clone.appendChild(elementClone);
      } else if (child.nodeType === Node.TEXT_NODE) {
        // Replace text with empty text node to preserve structure
        const emptyText = document.createTextNode("");
        clone.appendChild(emptyText);
      }
    }

    return clone;
  }

  return cloneStructureOnly(tempDiv).innerHTML;
}

/* Helper function to get partial HTML content based on character count */
function getPartialHTML(fullHTML, targetText) {
  // Create a temporary element to parse the full HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = fullHTML;

  // Get the full plain text to know total length
  const fullText = tempDiv.textContent || tempDiv.innerText;

  // If we want 0 characters, return empty string
  if (targetText.length === 0) {
    return "";
  }

  // If we want the full text, return the full HTML
  if (targetText.length >= fullText.length) {
    return fullHTML;
  }

  // For partial content, we need to carefully build HTML
  return buildPartialHTML(tempDiv, targetText.length);
}

/* Helper function to build partial HTML with proper structure */
function buildPartialHTML(element, maxChars) {
  let charCount = 0;
  const result = document.createElement("div");

  // Clone the element structure but only include text up to maxChars
  function processNode(sourceNode, targetParent) {
    for (const child of sourceNode.childNodes) {
      if (charCount >= maxChars) break;

      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        const remainingChars = maxChars - charCount;

        if (remainingChars >= text.length) {
          // Include the entire text node
          const textNode = document.createTextNode(text);
          targetParent.appendChild(textNode);
          charCount += text.length;
        } else {
          // Include partial text and stop
          const partialText = text.substring(0, remainingChars);
          if (partialText.length > 0) {
            const textNode = document.createTextNode(partialText);
            targetParent.appendChild(textNode);
          }
          charCount += remainingChars;
          break;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // For element nodes, only create them if they will contain text
        const elementCopy = child.cloneNode(false);
        const beforeCharCount = charCount;

        // Recursively process children
        processNode(child, elementCopy);

        // Only add the element if it actually got some content
        if (charCount > beforeCharCount) {
          targetParent.appendChild(elementCopy);
        }
      }
    }
  }

  processNode(element, result);
  return result.innerHTML;
}

/* Typewriter effect function - displays text character by character */
function typeMessage(element, text, startIndex = 0) {
  let currentIndex = startIndex;

  // Create an interval that adds one character to the element's text content
  const typingInterval = setInterval(() => {
    // Add the next character to the element
    element.textContent = text.substring(0, currentIndex + 1);

    // Get the character we just added
    const currentChar = text[currentIndex];

    currentIndex++;

    // Auto-scroll only if user is at bottom
    autoScrollIfAtBottom();

    // Stop when we've typed the entire message
    if (currentIndex >= text.length) {
      clearInterval(typingInterval);
      return;
    }

    // Check if current character is punctuation that needs a pause
    const isPunctuation = [".", ",", "!", "?"].includes(currentChar);

    if (isPunctuation) {
      // Clear the current interval
      clearInterval(typingInterval);

      // Start a new interval after the punctuation pause
      // Continue from the current position instead of starting over
      setTimeout(() => {
        typeMessage(element, text, currentIndex);
      }, PUNCTUATION_PAUSE);
    }
  }, TYPING_SPEED);
}

/* Helper function to disable user input while AI is responding */
function disableUserInput() {
  isAiResponding = true;
  userInput.disabled = true;
  userInput.placeholder = "AI is responding...";

  // Get the send button and disable it
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
}

/* Helper function to enable user input when AI is done responding */
function enableUserInput() {
  isAiResponding = false;
  userInput.disabled = false;
  userInput.placeholder = "Ask me about products or routines…";

  // Get the send button and enable it
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = false;

  // Focus back on the input for better user experience
  userInput.focus();
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Don't allow new messages if AI is already responding
  if (isAiResponding) {
    return;
  }

  // Get user input value
  const userMessage = userInput.value.trim();

  // Don't send empty messages
  if (!userMessage) return;

  // Disable input while processing
  disableUserInput();

  // Display user message in chat (show as separate black bubble)
  addMessage(userMessage, "user", false);

  // Store the user message for later use in combined display
  const currentUserMessage = userMessage;

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Clear input field
  userInput.value = "";

  // Show loading message (no typewriter effect for loading)
  addMessage("Thinking...", "ai", false);

  try {
    // Send the complete conversation history to maintain context
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory, // Send entire conversation history
      }),
    });

    // Check if request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse JSON response
    const data = await response.json();

    // Remove loading message
    chatWindow.removeChild(chatWindow.lastChild);

    // Get AI response from OpenAI format
    const aiResponse = data.choices[0].message.content;

    // Add AI response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    // Display AI response with user prompt above it and typewriter effect
    addMessage(aiResponse, "ai", true, currentUserMessage);

    // Re-enable input after typewriter effect completes
    // We'll add a delay to ensure typewriter effect finishes
    const estimatedTypingTime = aiResponse.length * TYPING_SPEED + 1000; // Add 1 second buffer
    setTimeout(() => {
      enableUserInput();
    }, estimatedTypingTime);
  } catch (error) {
    // Remove loading message
    chatWindow.removeChild(chatWindow.lastChild);

    // Show error message to user (no typewriter effect for errors)
    addMessage(
      "Sorry, I'm having trouble connecting right now. Please try again.",
      "ai",
      false
    );

    // Re-enable input immediately on error
    enableUserInput();

    // Log error for debugging
    console.error("Error calling Cloudflare Worker:", error);
  }
});
