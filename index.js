import express from 'express';
import multer from 'multer';
import { GoogleGenAI, Modality } from "@google/genai";
import fs from 'fs';
import open from 'open';
import 'dotenv/config';

const app = express();
const port = 3000;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Middleware to parse form data
const upload = multer();
app.use(express.urlencoded({ extended: true }));

// Function to read image and convert to base64
const imageToBase64 = (imagePath) => {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString("base64");
  } catch (error) {
    console.error(`Error reading image ${imagePath}:`, error);
    return null;
  }
};

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

app.post('/generate', upload.none(), async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const exampleImage1Base64 = imageToBase64("example/1.png");
    const exampleImage2Base64 = imageToBase64("example/2.png");
    const exampleImage3Base64 = imageToBase64("example/3.png");
    const exampleImage4Base64 = imageToBase64("example/4.png");
    const exampleImage5Base64 = imageToBase64("example/5.png");

    if (!exampleImage1Base64 || !exampleImage2Base64 || !exampleImage3Base64 || !exampleImage4Base64 || !exampleImage5Base64) {
      throw new Error("Failed to load example images");
    }

    // Create contents array with system instruction and example
    const contents = [
      { role: "system", text: "You are an expert at generating images of Dolly, a fantasy character with dark skin tone, colorful hairstyles incorporating horn-like or decorative headpieces, and ornate or stylized outfits." },
      { role: "user", text: "A beautiful librarian." },
      { role: "model", inlineData: { mimeType: "image/png", data: exampleImage1Base64 } },
      { role: "user", text: "A school teacher." },
      { role: "model", inlineData: { mimeType: "image/png", data: exampleImage2Base64 } },
      { role: "user", text: "A house maid." },
      { role: "model", inlineData: { mimeType: "image/png", data: exampleImage3Base64 } },
      { role: "user", text: "A lingerie model." },
      { role: "model", inlineData: { mimeType: "image/png", data: exampleImage4Base64 } },
      { role: "user", text: "A college student." },
      { role: "model", inlineData: { mimeType: "image/png", data: exampleImage5Base64 } },
      { role: "user", text: prompt } // The user's input prompt
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, 'base64');
        const imageName = `generated_image_${Date.now()}.png`;
        const imagePath = `public/${imageName}`;

        fs.writeFileSync(imagePath, buffer);
        console.log(`Image saved as ${imagePath}`);
        open(imagePath);
        res.send(`Image generated and opened! <br><img src="/${imageName}" alt="Generated Image">`);
        return;
      } else if (part.text) {
        console.log("Accompanying Text:", part.text);
        res.send(`Generated text: ${part.text}<br>No image generated.`);
        return;
      }
    }

    res.send('Image generation failed or no image was returned.');

  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).send('Error generating image.');
  }
});

// Serve static files (for displaying the image in the browser)
app.use(express.static('public'));

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Create example directory if it doesn't exist
if (!fs.existsSync('example')) {
  fs.mkdirSync('example');
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
