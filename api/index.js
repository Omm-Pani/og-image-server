const express = require("express");
const chromium = require("@sparticuz/chromium");
const playwright = require("playwright-core");
require("dotenv").config();
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const { log } = require("console");

const app = express();
const PORT = 3001;
const PUBLIC_DIR = process.env.PUBLIC_DIR || "public";
const IMAGES_DIR = path.join(__dirname, PUBLIC_DIR, "images");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.use(
  cors({
    origin: "https://og-image-generator-rouge.vercel.app", // Frontend URL
    credentials: true, // Allow credentials (cookies) to be sent
  })
);
app.use(express.json());
app.use("/images", express.static("/tmp"));
// path.join(__dirname, "../public/images")
app.post("/generate-og-image", upload.single("image"), async (req, res) => {
  const { title, content } = req.body;
  const imagePath = req.file ? `/images/${req.file.filename}` : null;
  // const outputFilePath = `./public/images/og-${Date.now()}.png`;
  // const outputFilePath = path.join(IMAGES_DIR, `og-${Date.now()}.png`);
  const outputFilePath = path.join("/tmp", `og-${Date.now()}.png`);

  try {
    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true, // use this instead of using chromium.headless because it uses the new `headless: "new"` which will throw because playwright expects `headless: boolean`
    });

    const page = await browser.newPage();

    await page.setContent(`
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          font-family: Arial, sans-serif;
          position: relative;
          background-color: black;
        }
        .container-wrap {
          width: 1200px;
          height: 630px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .container {
          width: 1000px;
          height: auto;
          padding: 0.5rem;
          margin-bottom: 1rem;
          border-radius: 0.375rem;
          background-color: #ffffff;
        }
        .container-header {
          display: flex;
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          padding-left: 1rem;
          padding-right: 1rem;
          align-items: center;
        }
        .header-image {
          border-radius: 9999px;
          width: 2.5rem;
          height: 2.5rem;
        }
        .header-title {
          font-size: 0.875rem;
          line-height: 1.25rem;
          font-weight: 600;
          color: rgb(109, 106, 106);
        }
        .content {
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
          padding-left: 1rem;
          padding-right: 1rem;
        }
        .content-desc {
          color: #374151;
        }
        .post-action-container {
          display: flex;
          padding-left: 3rem;
          padding-right: 3rem;
          justify-content: space-between;
          border-top: 2px solid #e5e7eb;
          font-size: 0.875rem;
          line-height: 1.25rem;
          font-weight: 500;
        }
        .post-action {
          display: flex;
          margin-left: 0.25rem;
          gap: 0.25rem;
          align-items: center;
          color: #6b7280;
        }
        .mr-2 {
          margin-right: 0.5rem;
        }
        .header-logo {
          width: 2rem;
          height: 2rem;
        }
        .image {
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          z-index: -1;
        }
      </style>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
      />
           ${imagePath && `<meta property="og:image" content={ogImageUrl}/>`}
            <meta property="og:title" content=${title} />
            <meta property="og:description" content=${content} />
    </head>
    <body>
      <div class="container-wrap">
        <div class="container">
          <div
            class="container-header"
            style="display: flex; justify-content: space-between"
          >
            <div style="display: flex; align-items: center">
              <div class="mr-2">
                <img
                  src="https://picsum.photos/seed/picsum/200/200"
                  alt="Profile picture"
                  class="header-image"
                />
              </div>
              <div>
                <div class="header-title">${title}</div>
              </div>
            </div>
            <div>
              <img
                src="https://cdn-icons-png.flaticon.com/512/124/124010.png"
                class="header-logo"
                alt=""
              />
            </div>
          </div>
          <div class="content">
            <p class="content-desc" style="text-align: left">${content}</p>
            <div style="position: relative; width: auto; height: 20rem">
              ${
                imagePath
                  ? `<img
                src="http://localhost:${PORT}${imagePath}"
                style="
                  object-fit: contain;
                  border-radius: 0.5rem;
                  width: 100%;
                  height: 100%;
                "
              />`
                  : ""
              }
            </div>
          </div>
          <div class="post-action-container">
            <div class="post-action">
              <i class="fa fa-thumbs-up" style="font-size: 1.25rem"></i>
              <p style="font-size: 1.25rem">Like</p>
            </div>
            <div class="post-action">
              <i class="fa fa-comment" style="font-size: 1.25rem"></i>
              <p style="font-size: 1.25rem">Comment</p>
            </div>
            <div class="post-action">
              <i class="fa fa-share" style="font-size: 1.25rem"></i>
              <p style="font-size: 1.25rem">Share</p>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `);

    try {
      console.log("Starting screenshot process");
      await page.screenshot({ path: outputFilePath });
      console.log("Screenshot taken successfully:", outputFilePath);
    } catch (screenshotError) {
      console.error("Error taking screenshot:", screenshotError);
      throw new Error("Screenshot failed");
    } finally {
      await browser.close();
    }

    res.json({
      imageUrl: `https://og-image-server-git-main-ommpanis-projects.vercel.app/images/${path.basename(
        outputFilePath
      )}`,
    });
  } catch (error) {
    console.error("Error generating OG image:", error);
    res
      .status(500)
      .json({ message: "Server Error during og-image-gen", error: error });
  }
});
app.get("/", (req, res) => res.send("welcome to server"));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
