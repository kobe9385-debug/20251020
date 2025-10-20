// Global variables declaration
let circles = [];
let popSound; // p5.SoundFile object for the MP3 pop sound
let score = 0; // Score variable
let floatingScores = []; // Array to hold transient score texts

// Color to score mapping
const colorScores = {
    '#90f1ef': 5,  // Light blue (+5)
    '#ffd6e0': 3,  // Pink (+3)
    '#ffef9f': 1,  // Pale yellow (+1)
    '#c1fba4': -3, // Light green (-3)
    '#7bf1a8': -5  // Green (-5)
};

// Bubble color palette
let colors = [
    '#90f1ef', // Light blue (+5)
    '#ffd6e0', // Pink (+3)
    '#ffef9f', // Pale yellow (+1)
    '#c1fba4', // Light green (-3)
    '#7bf1a8'  // Green (-5)
];
const CIRCLE_COUNT = 30; // Total number of circles (Updated to 30)

/**
 * Preload assets
 * Load the MP3 file, ensure it's ready before setup()
 */
function preload() {
    // NOTE: The file 'pop.mp3' must be in the same directory as this HTML file.
    popSound = loadSound('pop.mp3', 
        () => console.log('Sound loaded successfully!'), 
        (err) => console.error('Sound loading failed! Check pop.mp3 file path.', err)
    );
}

/**
 * Start the audio context upon user interaction
 * This function is called by the button in index.html
 */
function startAudio() {
    // p5.sound.js function to start the browser audio context
    userStartAudio(); 
    
    // Hide the overlay
    const overlay = document.getElementById('audio-overlay');
    overlay.style.opacity = 0;
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

function setup() {
    // Create canvas, making it the size of the browser window
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container'); // Attach canvas to the container
    noStroke(); // Ensure all circles have no outline
    frameRate(60); // Set frame rate to 60 fps
    
    // Generate the specified number of circle objects
    for (let i = 0; i < CIRCLE_COUNT; i++) {
        circles.push(new Bubble());
    }
}

function draw() {
    // Set background color to a2a3bb
    background(162, 163, 187); // RGB value of a2a3bb

    // Update and display each circle (bubbles)
    for (let i = 0; i < circles.length; i++) {
        circles[i].move();
        circles[i].display();
    }
    
    // Update and display floating score texts (on top of bubbles)
    for (let i = floatingScores.length - 1; i >= 0; i--) {
        floatingScores[i].update();
        floatingScores[i].display();
        if (floatingScores[i].isFinished()) {
            floatingScores.splice(i, 1);
        }
    }

    // Display UI text (Score and ID) last, ensuring they are always on top
    
    // Display score (Top Right)
    fill(255);
    textSize(32);
    textAlign(RIGHT, TOP); // Alignment to RIGHT
    text(`Score: ${score}`, width - 20, 20); // Position at (width - 20, 20)

    // Display the requested text "414730209" (in white, Top Left)
    fill(255); 
    textSize(20); 
    textAlign(LEFT, TOP); // Alignment to LEFT
    text("414730209", 20, 20); // Position at (20, 20)
}

/**
 * Handle mouse click (click bubble to burst it)
 */
function mousePressed() {
    // Check if the overlay is visible, if so, ignore game click
    if (document.getElementById('audio-overlay').style.display !== 'none' && 
        document.getElementById('audio-overlay').style.opacity > 0) {
        return;
    }

    // Check which bubble was clicked
    // Iterate backwards (since the last drawn is visually on top)
    for (let i = circles.length - 1; i >= 0; i--) {
        let bubble = circles[i];
        
        if (bubble.state === 'floating') {
            // Calculate distance from mouse to bubble center
            let d = dist(mouseX, mouseY, bubble.x, bubble.y);
            
            // If the click is within the bubble's radius
            if (d < bubble.diameter / 2) {
                bubble.state = 'bursting';
                bubble.burstTimer = bubble.burstDuration;
                bubble.burstX = bubble.x;
                bubble.burstY = bubble.y;
                bubble.burstDiameter = bubble.diameter;

                // 1. Update score based on color
                const scoreChange = colorScores[bubble.color];
                if (scoreChange !== undefined) {
                    score += scoreChange;
                    // ADDED: Create a floating score object and add it to the array
                    floatingScores.push(new FloatingScore(bubble.x, bubble.y, scoreChange));
                }

                // 2. Trigger sound
                if (popSound && popSound.isLoaded()) {
                    // Map diameter to playback rate:
                    // Small bubble (50) -> High playback rate (higher pitch)
                    // Large bubble (200) -> Low playback rate (lower pitch)
                    const rate = map(bubble.diameter, 50, 200, 1.5, 0.8);
                    popSound.rate(rate);
                    popSound.play();
                }

                // Only burst one bubble per click
                return; 
            }
        }
    }
}

// --- Bubble Object Class ---
class Bubble {
    constructor() {
        this.reset();
    }

    // Reset bubble attributes (position, size, speed) to make it appear from the bottom
    reset() {
        this.x = random(width);
        this.y = height + random(50, 100); 
        this.diameter = random(50, 200);
        // Inverse mapping speed to diameter: bigger bubbles move slower
        this.speed = map(this.diameter, 50, 200, 3, 0.5) * random(0.8, 1.2); 
        this.alpha = random(50, 200); // Bubble transparency
        this.color = random(colors); // Randomly select a color
        this.waveOffset = random(1000); // Horizontal wave offset
        this.waveSpeed = random(0.005, 0.02);
        this.originalX = this.x;

        // --- Burst-related attributes ---
        this.state = 'floating'; // State: 'floating' or 'bursting'
        this.burstDuration = 30; // Burst animation duration in frames
        this.burstTimer = 0; // Burst timer
        this.burstX = 0; // Burst X coordinate
        this.burstY = 0; // Burst Y coordinate
        this.burstDiameter = 0; // Burst diameter
    }

    // Move the circle upwards and handle bubble reset when it reaches the top
    move() {
        if (this.state === 'floating') {
            this.y -= this.speed;

            // Horizontal waving based on sine wave
            let waveAmount = sin(this.waveOffset + frameCount * this.waveSpeed) * 5;
            this.x = this.originalX + waveAmount;

            // 1. Check if the circle has floated to the top (normal reset)
            if (this.y < -this.diameter / 2) {
                this.reset(); 
                return;
            }
        } else if (this.state === 'bursting') {
            // Decrement burst timer
            this.burstTimer--;
            if (this.burstTimer <= 0) {
                this.reset(); // Burst animation finished, reset bubble
            }
        }
    }

    // Display the circle or the burst effect
    display() {
        if (this.state === 'floating') {
            // Draw the floating bubble
            this.drawFloatingBubble();
        } else if (this.state === 'bursting') {
            // Draw the burst effect
            this.drawBurst();
        }
    }
    
    // Draw the floating bubble
    drawFloatingBubble() {
        // Use createGraphics to create a temporary layer for the blurred highlight effect
        let bubbleGraphic = createGraphics(this.diameter, this.diameter);
        bubbleGraphic.noStroke();
        
        bubbleGraphic.translate(this.diameter / 2, this.diameter / 2);

        // Draw the circle itself
        let circleColor = color(this.color);
        circleColor.setAlpha(this.alpha);
        bubbleGraphic.fill(circleColor);
        bubbleGraphic.circle(0, 0, this.diameter);

        // Calculate and draw the soft, white square (highlight)
        let squareSize = this.diameter / 8;
        let angle = PI / 4; 
        let radius = this.diameter / 2;
        
        let squareX = radius * cos(angle) - squareSize * 0.7; 
        let squareY = -radius * sin(angle) + squareSize * 0.7; 

        bubbleGraphic.push();
        // Set the blur filter
        bubbleGraphic.drawingContext.filter = 'blur(4px)'; 

        let squareAlpha = this.alpha * 0.8; 
        bubbleGraphic.fill(255, 255, 255, squareAlpha); 

        bubbleGraphic.rectMode(CENTER);
        bubbleGraphic.rect(squareX, squareY, squareSize, squareSize);
        
        bubbleGraphic.pop(); 

        // Draw the temporary layer onto the main canvas
        image(bubbleGraphic, this.x - this.diameter / 2, this.y - this.diameter / 2);
    }
    
    // Draw the burst effect
    drawBurst() {
        // t: Time ratio, decreasing from 1.0 to 0.0
        let t = this.burstTimer / this.burstDuration; 
        let alpha = map(t, 1, 0, 200, 0); // Alpha fades from 200 to 0

        push();
        translate(this.burstX, this.burstY);
        noStroke();
        
        // Use the original bubble color, but with fading alpha for the fragments
        let burstColor = color(this.color);
        burstColor.setAlpha(alpha);
        fill(burstColor);
        
        // Simulate 8 small fragments expanding outwards
        for (let i = 0; i < 8; i++) {
            let angle = i * PI / 4; // Even distribution
            
            // Expansion distance: growing from 0
            let expansion = map(t, 1, 0, 0, this.burstDiameter * 0.7); 
            
            // Calculate fragment position
            let offsetX = cos(angle) * expansion;
            let offsetY = sin(angle) * expansion;

            // Fragment size: shrinks from 1/8 of diameter to 0
            let fragmentSize = this.burstDiameter * 0.12 * t; 
            
            circle(offsetX, offsetY, fragmentSize);
        }
        pop();
    }
}

// --- FloatingScore Object Class ---
class FloatingScore {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        // Yellow for positive score, Red for negative score
        this.color = value > 0 ? color(255, 255, 0) : color(255, 0, 0); 
        this.alpha = 255;
        this.lifespan = 60; // Duration in frames (1 second at 60fps)
        this.text = (value > 0 ? '+' : '') + value;
    }

    update() {
        this.y -= 1; // Move upwards
        this.alpha = map(this.lifespan, 60, 0, 255, 0); // Fade out
        this.lifespan--;
    }

    display() {
        push();
        textSize(30);
        textAlign(CENTER, CENTER);
        this.color.setAlpha(this.alpha);
        fill(this.color);
        text(this.text, this.x, this.y);
        pop();
    }

    isFinished() {
        return this.lifespan < 0;
    }
}

// --- Window resize handler ---
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // Recalculate the original X position for each bubble to prevent jumps
    for (let i = 0; i < circles.length; i++) {
        circles[i].originalX = circles[i].x;
    }
}
