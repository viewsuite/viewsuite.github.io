/**
 * Citation copy functionality
 * Adds copy-to-clipboard functionality for citation blocks
 */
export function initCitationCopy() {
  const copyButton = document.getElementById('copy-button');
  const codeElement = document.querySelector('.citation-block pre code');
  
  if (copyButton && codeElement) {
    copyButton.addEventListener('click', async () => {
      const citationText = codeElement.textContent || '';
      
      try {
        await navigator.clipboard.writeText(citationText);
        
        // Visual feedback
        copyButton.classList.add('copied');
        
        // Reset after 2 seconds
        setTimeout(() => {
          copyButton.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
        copyButton.classList.add('copy-error');
        
        setTimeout(() => {
          copyButton.classList.remove('copy-error');
        }, 2000);
      }
    });
  }
} 