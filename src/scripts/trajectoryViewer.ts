// Type definitions for trajectory data
interface State {
  image: string;
  description: string;
}

interface Step {
  state: State;
  reasoning: string;
  action: string;
}

interface Trajectory {
  name: string;
  description: string;
  totalSteps: number;
  success: boolean;
  reasoningScore: string;
  completionTime: string;
  steps: Step[];
}

interface TaskData {
  taskName: string;
  taskDescription: string;
  trajectories: Record<string, Trajectory>;
}

interface Task {
  id: string;
  name: string;
  description: string;
  dataFile: string;
  thumbnail: string;
}

interface TaskIndex {
  version: string;
  lastUpdated: string;
  tasks: Task[];
}

// Initialize the trajectory viewer
export function initTrajectoryViewer() {
  // Element references
  const taskSelect = document.getElementById('task-select') as HTMLSelectElement;
  const trajectorySelect = document.getElementById('trajectory-select') as HTMLSelectElement;
  const timelineStepsContainer = document.getElementById('timeline-steps');
  const currentStepElement = document.getElementById('current-step');
  const totalStepsElement = document.getElementById('total-steps');
  const stateImageElement = document.getElementById('state-image') as HTMLImageElement;
  const stateTextElement = document.getElementById('state-text');
  const reasoningTextElement = document.getElementById('reasoning-text');
  const actionTextElement = document.getElementById('action-text');
  const successValueElement = document.getElementById('success-value');
  const totalStepsValueElement = document.getElementById('total-steps-value');
  const reasoningScoreElement = document.getElementById('reasoning-score');
  const completionTimeElement = document.getElementById('completion-time');
  const prevStepButton = document.getElementById('prev-step') as HTMLButtonElement;
  const nextStepButton = document.getElementById('next-step') as HTMLButtonElement;
  const playPauseButton = document.getElementById('play-pause') as HTMLButtonElement;
  
  // State variables
  let availableTasks: Task[] = [];
  let taskData: Record<string, TaskData> = {};
  let currentTaskId = '';
  let currentTrajectoryId = '';
  let currentStepIndex = 0;
  let isPlaying = false;
  let playInterval: number | null = null;
  
  // Display error message
  function showErrorMessage(message: string) {
    if (timelineStepsContainer) {
      timelineStepsContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }
  
  // Show loading indicator
  function showLoading() {
    if (timelineStepsContainer) {
      timelineStepsContainer.innerHTML = `
        <div class="loading-indicator">
          <div class="spinner"></div>
          <p>Loading trajectory data...</p>
        </div>
      `;
    }
  }
  
  // Load the task index
  async function loadTaskIndex() {
    try {
      showLoading();
      
      const response = await fetch('data/trajectories/qwen2.5-0.5b/index.json');
      if (!response.ok) {
        throw new Error(`Failed to load task index: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as TaskIndex;
      availableTasks = data.tasks;
      
      // Populate task select dropdown
      if (taskSelect) {
        taskSelect.innerHTML = '';
        availableTasks.forEach(task => {
          const option = document.createElement('option');
          option.value = task.id;
          option.textContent = task.name;
          taskSelect.appendChild(option);
        });
        
        // Load the first task by default
        if (availableTasks.length > 0) {
          await loadTaskData(availableTasks[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading task index:', error);
      showErrorMessage('Failed to load tasks. Please try again later.');
    }
  }
  
  // Load task data
  async function loadTaskData(taskId: string) {
    try {
      showLoading();
      
      // Find the task info
      const taskInfo = availableTasks.find(task => task.id === taskId);
      if (!taskInfo) {
        throw new Error(`Task with ID ${taskId} not found`);
      }
      
      // Load the task data file
      const response = await fetch(taskInfo.dataFile);
      if (!response.ok) {
        throw new Error(`Failed to load task data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as TaskData;
      taskData[taskId] = data;
      currentTaskId = taskId;
      
      // Populate trajectory select dropdown
      if (trajectorySelect) {
        trajectorySelect.innerHTML = '';
        
        Object.entries(data.trajectories).forEach(([id, trajectory]) => {
          const option = document.createElement('option');
          option.value = id;
          option.textContent = trajectory.name || id;
          trajectorySelect.appendChild(option);
        });
        
        // Load the first trajectory by default
        if (trajectorySelect.options.length > 0) {
          currentTrajectoryId = trajectorySelect.options[0].value;
          initializeTimeline();
        }
      }
    } catch (error) {
      console.error(`Error loading task data for ${taskId}:`, error);
      showErrorMessage(`Failed to load data for ${taskId}. Please try again later.`);
    }
  }
  
  // Initialize the timeline
  function initializeTimeline() {
    if (!timelineStepsContainer || !currentTaskId || !currentTrajectoryId) return;
    
    const currentTask = taskData[currentTaskId];
    if (!currentTask) return;
    
    const trajectory = currentTask.trajectories[currentTrajectoryId];
    if (!trajectory) return;
    
    const totalSteps = trajectory.steps.length;
    
    // Clear existing timeline steps
    timelineStepsContainer.innerHTML = '';
    
    // Add timeline progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'timeline-progress';
    progressBar.style.width = '0%';
    timelineStepsContainer.appendChild(progressBar);
    
    // Add step markers
    for (let i = 0; i < totalSteps; i++) {
      const step = document.createElement('div');
      step.className = 'timeline-step';
      step.style.left = `${(i / (totalSteps - 1)) * 100}%`;
      step.dataset.index = i.toString();
      
      step.addEventListener('click', () => {
        navigateToStep(i);
      });
      
      timelineStepsContainer.appendChild(step);
    }
    
    // Update step counter
    if (currentStepElement) currentStepElement.textContent = '1';
    if (totalStepsElement) totalStepsElement.textContent = totalSteps.toString();
    
    // Update metrics
    if (totalStepsValueElement) totalStepsValueElement.textContent = totalSteps.toString();
    if (successValueElement) {
      successValueElement.textContent = trajectory.success ? 'Yes' : 'No';
      successValueElement.className = trajectory.success ? 'metric-value success' : 'metric-value failure';
    }
    if (reasoningScoreElement) reasoningScoreElement.textContent = trajectory.reasoningScore || 'N/A';
    if (completionTimeElement) completionTimeElement.textContent = trajectory.completionTime || 'N/A';
    
    // Navigate to first step
    navigateToStep(0);
  }
  
  // Navigate to a specific step
  function navigateToStep(stepIndex: number) {
    if (!currentTaskId || !currentTrajectoryId) return;
    
    const currentTask = taskData[currentTaskId];
    if (!currentTask) return;
    
    const trajectory = currentTask.trajectories[currentTrajectoryId];
    if (!trajectory) return;
    
    const totalSteps = trajectory.steps.length;
    
    if (stepIndex < 0 || stepIndex >= totalSteps) {
      return;
    }
    
    currentStepIndex = stepIndex;
    const step = trajectory.steps[stepIndex];
    
    // Update step counter
    if (currentStepElement) currentStepElement.textContent = (stepIndex + 1).toString();
    
    // Update timeline UI
    if (timelineStepsContainer) {
      const steps = timelineStepsContainer.querySelectorAll('.timeline-step');
      const progressBar = timelineStepsContainer.querySelector('.timeline-progress') as HTMLElement;
      
      steps.forEach((stepEl, index) => {
        if (index < stepIndex) {
          stepEl.className = 'timeline-step completed';
        } else if (index === stepIndex) {
          stepEl.className = 'timeline-step active';
        } else {
          stepEl.className = 'timeline-step';
        }
      });
      
      // Update progress bar
      if (progressBar) {
        const progressPercentage = (stepIndex / (totalSteps - 1)) * 100;
        progressBar.style.width = `${progressPercentage}%`;
      }
    }
    
    // Update state and action display
    if (stateImageElement) stateImageElement.src = step.state.image || 'placeholder-state.png';
    if (stateTextElement) stateTextElement.textContent = step.state.description || '';
    if (reasoningTextElement) reasoningTextElement.innerHTML = `<p>${step.reasoning || ''}</p>`;
    if (actionTextElement) actionTextElement.textContent = step.action || '';
    
    // Update button states
    if (prevStepButton) prevStepButton.disabled = stepIndex === 0;
    if (nextStepButton) nextStepButton.disabled = stepIndex === totalSteps - 1;
  }
  
  // Play trajectory automatically
  function playTrajectory() {
    if (!currentTaskId || !currentTrajectoryId) return;
    
    const currentTask = taskData[currentTaskId];
    if (!currentTask) return;
    
    const trajectory = currentTask.trajectories[currentTrajectoryId];
    if (!trajectory) return;
    
    if (isPlaying) {
      if (playInterval !== null) {
        clearInterval(playInterval);
        playInterval = null;
      }
      
      const playIcon = playPauseButton?.querySelector('.play-icon') as HTMLElement;
      const pauseIcon = playPauseButton?.querySelector('.pause-icon') as HTMLElement;
      
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      
      isPlaying = false;
    } else {
      playInterval = window.setInterval(() => {
        if (currentStepIndex < trajectory.steps.length - 1) {
          navigateToStep(currentStepIndex + 1);
        } else {
          if (playInterval !== null) {
            clearInterval(playInterval);
            playInterval = null;
          }
          
          const playIcon = playPauseButton?.querySelector('.play-icon') as HTMLElement;
          const pauseIcon = playPauseButton?.querySelector('.pause-icon') as HTMLElement;
          
          if (playIcon) playIcon.style.display = 'block';
          if (pauseIcon) pauseIcon.style.display = 'none';
          
          isPlaying = false;
        }
      }, 2000); // Advance every 2 seconds
      
      const playIcon = playPauseButton?.querySelector('.play-icon') as HTMLElement;
      const pauseIcon = playPauseButton?.querySelector('.pause-icon') as HTMLElement;
      
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
      
      isPlaying = true;
    }
  }
  
  // Initialize controls
  function initializeControls() {
    if (prevStepButton) {
      prevStepButton.addEventListener('click', () => {
        if (currentStepIndex > 0) {
          navigateToStep(currentStepIndex - 1);
        }
      });
    }
    
    if (nextStepButton) {
      nextStepButton.addEventListener('click', () => {
        if (!currentTaskId || !currentTrajectoryId) return;
        
        const currentTask = taskData[currentTaskId];
        if (!currentTask) return;
        
        const trajectory = currentTask.trajectories[currentTrajectoryId];
        if (!trajectory) return;
        
        if (currentStepIndex < trajectory.steps.length - 1) {
          navigateToStep(currentStepIndex + 1);
        }
      });
    }
    
    if (playPauseButton) {
      playPauseButton.addEventListener('click', playTrajectory);
    }
    
    if (taskSelect) {
      taskSelect.addEventListener('change', async (e) => {
        const target = e.target as HTMLSelectElement;
        await loadTaskData(target.value);
      });
    }
    
    if (trajectorySelect) {
      trajectorySelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        currentTrajectoryId = target.value;
        initializeTimeline();
      });
    }
  }
  
  // Run initialization
  async function init() {
    await loadTaskIndex();
    initializeControls();
  }
  
  // Only initialize if necessary elements exist
  if (taskSelect && trajectorySelect && timelineStepsContainer) {
    init().catch(error => {
      console.error('Failed to initialize trajectory viewer:', error);
    });
  }
} 