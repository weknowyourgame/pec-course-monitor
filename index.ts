import { Stagehand, Page, BrowserContext } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import chalk from "chalk";
import boxen from "boxen";
import { drawObserveOverlay, clearOverlays, actWithCache, announce } from "./utils.js";
import { z } from "zod";
import readline from 'readline';
import OpenAI from "openai";
import { CustomOpenAIClient } from "./llm_clients/customOpenAI_client.js";

// Email schema
const emailReqSchema = z.object({
  email: z.string(),
  subject: z.string(),
  body: z.string(),
});

type EmailReq = z.infer<typeof emailReqSchema>;

// Email sending function
async function sendEmail(input: EmailReq) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'PEC Course Monitor <noreply@sarthakkapila.com>',
      to: [input.email],
      subject: input.subject,
      html: input.body,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(chalk.green('✅ Email sent successfully'));
    return data;
  } else {
    console.log(chalk.red('❌ Failed to send email'));
    return null;
  }
}

// Configuration
const PEC_URL = "https://pec.edu.in";
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

// Create readline interface for user input (as fallback)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for CAPTCHA input (fallback method)
function promptForCaptcha(): Promise<string> {
  return new Promise((resolve) => {
    rl.question(chalk.yellow.bold('\n🔍 Please enter the CAPTCHA text shown in the browser: '), (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper to recognize CAPTCHA using LLM
async function recognizeCaptchaWithLLM(imageBuffer: Buffer): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const llm = new CustomOpenAIClient({ modelName: "gpt-4o", client: openai });

  // Compose the message with text and image
  const prompt =
    "Look at the CAPTCHA image and tell me what characters are shown. The CAPTCHA should contain letters and/or numbers. Return ONLY the characters you see, nothing else. Be precise and accurate.";

  const response = await llm.createChatCompletion({
    options: {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBuffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
      max_tokens: 20,
      temperature: 0.1,
    },
    logger: () => {},
  });

  // Extract the text content from the response
  const text = (response as any).data?.replace(/[^a-zA-Z0-9]/g, "") || "";
  return text;
}

async function solveCaptchaAutomatically(page: Page, stagehand: Stagehand): Promise<string> {
  stagehand.log({ category: "captcha", message: "Attempting automatic CAPTCHA recognition" });

  try {
    // Find the CAPTCHA image and get its bounding box
    const captchaInfo = await page.evaluate(() => {
      const captchaImg = document.querySelector('img[src*="captcha"], img[alt*="captcha" i], img[alt*="CAPTCHA" i]');
      if (!captchaImg) return null;
      const rect = captchaImg.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        devicePixelRatio: window.devicePixelRatio,
      };
    });

    if (!captchaInfo) {
      throw new Error("Could not find CAPTCHA image");
    }

    // Take a screenshot of the CAPTCHA region
    const screenshotBuffer = await page.screenshot({
      clip: {
        x: captchaInfo.x * captchaInfo.devicePixelRatio,
        y: captchaInfo.y * captchaInfo.devicePixelRatio,
        width: captchaInfo.width * captchaInfo.devicePixelRatio,
        height: captchaInfo.height * captchaInfo.devicePixelRatio,
      },
    });

    stagehand.log({ category: "captcha", message: "Sending CAPTCHA screenshot to LLM" });

    // Recognize the CAPTCHA using the LLM
    const captchaText = await recognizeCaptchaWithLLM(screenshotBuffer);

    stagehand.log({
      category: "captcha",
      message: `Automatic CAPTCHA recognition result: ${captchaText}`,
      auxiliary: { captchaText: { value: captchaText, type: "string" } },
    });

    announce(`CAPTCHA automatically recognized: ${chalk.green(captchaText)}`, "Auto CAPTCHA");

    return captchaText;
  } catch (error: any) {
    stagehand.log({
      category: "error",
      message: `Error during automatic CAPTCHA recognition: ${error.message}`,
      level: 2,
    });

    announce(`Automatic CAPTCHA recognition failed: ${error.message}`, "CAPTCHA Error");

    // Fall back to manual input
    announce("Falling back to manual CAPTCHA input", "Manual Fallback");
    console.log(chalk.yellow("Please look at the browser window and enter the CAPTCHA text shown."));

    return await promptForCaptcha();
  }
}

async function monitorCourseAvailability({
  page,
  context,
  stagehand,
}: {
  page: Page;
  context: BrowserContext;
  stagehand: Stagehand;
}) {
  while (true) {
    try {
      announce("Starting course availability check", "PEC Course Monitor");
      
      // Step 1: Navigate to PEC website
      stagehand.log({ category: "navigation", message: "Navigating to PEC website" });
      await page.goto(PEC_URL);
      
      // Step 2: Click on "Login with AIS Credentials"
      stagehand.log({ category: "action", message: "Clicking login with AIS credentials" });
      await page.act("Click the button that says 'Login with AIS Credentials'");
      await page.waitForTimeout(2000);
      
      // Step 3: Enter username
      stagehand.log({ category: "action", message: "Entering username" });
      await page.act(`Type "${USERNAME}" into the username field`);
      await page.waitForTimeout(1000);
      
      // Step 4: Enter password
      stagehand.log({ category: "action", message: "Entering password" });
      await page.act(`Type "${PASSWORD}" into the password field`);
      await page.waitForTimeout(1000);
      
      // Step 5: Handle CAPTCHA - AUTOMATIC APPROACH
      stagehand.log({ category: "action", message: "Handling CAPTCHA automatically" });
      
      // Get the CAPTCHA text automatically
      const captchaText = await solveCaptchaAutomatically(page, stagehand);
      
      // Enter the CAPTCHA
      await page.act(`Type "${captchaText}" into the CAPTCHA input field`);
      await page.waitForTimeout(1000);
      
      // Step 6: Click login button
      stagehand.log({ category: "action", message: "Clicking login button" });
      await page.act("Click the 'Log in' button");
      await page.waitForTimeout(5000);
      
      // Check if login was successful by looking for elements that should appear after login
      const { isLoggedIn } = await page.extract({
        instruction: "Check if we are logged in by looking for user profile elements or dashboard elements",
        schema: z.object({
          isLoggedIn: z.boolean().describe("Whether we are successfully logged in")
        }),
      });
      
      if (!isLoggedIn) {
        announce("Automatic CAPTCHA recognition failed. Please enter CAPTCHA manually.", "Manual CAPTCHA Required");
        // Fall back to manual input
        const captchaTextManual = await promptForCaptcha();
        await page.act(`Type "${captchaTextManual}" into the CAPTCHA input field`);
        await page.waitForTimeout(1000);

        // Re-check login status after manual input
        const { isLoggedInManual } = await page.extract({
          instruction: "Check if we are logged in after manual CAPTCHA input",
          schema: z.object({
            isLoggedInManual: z.boolean().describe("Whether we are successfully logged in after manual CAPTCHA")
          }),
        });

        if (!isLoggedInManual) {
          announce("Login failed after manual CAPTCHA. Please check credentials or CAPTCHA.", "Login Failed");
          throw new Error("Login failed after manual CAPTCHA. Please check credentials or CAPTCHA.");
        }
        announce("Login successful!", "Login Success");
      } else {
        announce("Login successful!", "Login Success");
      }
      
      // Step 7: Navigate to Add & Drop Courses
      stagehand.log({ category: "navigation", message: "Navigating to Add & Drop Courses" });
      await page.act("Click on the 'Add & Drop Courses' link in the menu");
      await page.waitForTimeout(3000);
      
      // Step 8: Click on "Click Here for Add/Drop Courses"
      stagehand.log({ category: "action", message: "Clicking on Add/Drop Courses button" });
      await page.act("Click on the button that says 'Click Here for Add/Drop Courses'");
      await page.waitForTimeout(5000);
      
      // Step 9: Check if CS6701 COMPUTER NETWORKS course checkbox is selectable (SPECIAL PRIORITY)
      stagehand.log({ category: "check", message: "Checking if CS6701 COMPUTER NETWORKS is selectable (SPECIAL PRIORITY)" });

      // Manual HTML analysis for CS6701
      const cs6701Status = await page.evaluate(() => {
        const courseRows = Array.from(document.querySelectorAll('tr'));
        const cs6701Row = courseRows.find(row => {
          const cells = row.querySelectorAll('td');
          return Array.from(cells).some(cell => cell.textContent?.includes('CS6701'));
        });
        
        if (!cs6701Row) {
          return { isVisible: false, isSelectable: false, checkboxState: 'not_found' };
        }
        
        const checkbox = cs6701Row.querySelector('input[type="checkbox"]');
        if (!checkbox) {
          return { isVisible: true, isSelectable: false, checkboxState: 'not_found' };
        }
        
        const isDisabled = checkbox.hasAttribute('disabled');
        const isChecked = checkbox.hasAttribute('checked');
        const onclick = checkbox.getAttribute('onclick');
        
        let checkboxState = 'unchecked';
        if (isChecked) checkboxState = 'checked';
        
        return {
          isVisible: true,
          isSelectable: !isDisabled,
          checkboxState,
          onclick: onclick || 'none'
        };
      });
      
      const { isSelectable, isVisible, checkboxState } = cs6701Status;
      
      // Log the results
      stagehand.log({
        category: "result",
        message: `CS6701 COMPUTER NETWORKS course status (SPECIAL PRIORITY):`,
        auxiliary: {
          isVisible: { value: String(isVisible), type: "string" },
          isSelectable: { value: String(isSelectable), type: "string" },
          checkboxState: { value: checkboxState, type: "string" },
          onclick: { value: cs6701Status.onclick, type: "string" }
        }
      });
      
      // Print a nice formatted message
      announce(
        `🎯 SPECIAL PRIORITY COURSE: CS6701 COMPUTER NETWORKS\n` +
        `Visible: ${isVisible ? chalk.green('YES') : chalk.red('NO')}\n` +
        `Selectable: ${isSelectable ? chalk.green('YES') : chalk.red('NO')}\n` +
        `Checkbox: ${
          checkboxState === "checked" ? chalk.blue('CHECKED') : 
          checkboxState === "unchecked" ? chalk.yellow('UNCHECKED') : 
          chalk.red('NOT FOUND')
        }\n` +
        `onclick: ${chalk.cyan(cs6701Status.onclick)}`,
        "Course Status"
      );

      // Step 10: Check ALL courses on the page
      stagehand.log({ category: "check", message: "Checking ALL courses on the page" });

      // Manual HTML analysis for ALL courses
      const allCourses = await page.evaluate(() => {
        const courseRows = Array.from(document.querySelectorAll('tr'));
        const courses = [];
        
        for (const row of courseRows) {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 3) continue; // Skip rows that don't have enough cells
          
          // Look for course code in the cells
          let courseCode = '';
          let courseName = '';
          
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i].textContent?.trim() || '';
            // Course codes are typically 6-7 characters with letters and numbers
            if (cellText.match(/^[A-Z]{2}\d{4}$/) && !courseCode) {
              courseCode = cellText;
              // Course name is usually in the next cell
              if (cells[i + 1]) {
                courseName = cells[i + 1].textContent?.trim() || '';
              }
              break;
            }
          }
          
          if (!courseCode) continue; // Skip rows without course codes
          
          // Find checkbox in this row
          const checkbox = row.querySelector('input[type="checkbox"]');
          let isSelectable = false;
          let checkboxState = 'not_found';
          let onclick = 'none';
          
          if (checkbox) {
            const isDisabled = checkbox.hasAttribute('disabled');
            const isChecked = checkbox.hasAttribute('checked');
            onclick = checkbox.getAttribute('onclick') || 'none';
            
            isSelectable = !isDisabled;
            checkboxState = isChecked ? 'checked' : 'unchecked';
          }
          
          courses.push({
            courseCode,
            courseName,
            isSelectable,
            isVisible: true,
            checkboxState,
            onclick
          });
        }
        
        return courses;
      });
      
      // Log the results
      stagehand.log({
        category: "result",
        message: `All courses status:`,
        auxiliary: {
          totalCourses: { value: String(allCourses.length), type: "string" },
          courses: { value: JSON.stringify(allCourses), type: "string" }
        }
      });
      
      // Print a nice formatted message for all courses
      announce(
        `📋 ALL COURSES ON PAGE (${allCourses.length} total):\n` +
        allCourses.map(course => 
          `${course.courseCode} ${course.courseName}\n` +
          `  Visible: ${course.isVisible ? chalk.green('YES') : chalk.red('NO')}\n` +
          `  Selectable: ${course.isSelectable ? chalk.green('YES') : chalk.red('NO')}\n` +
          `  Checkbox: ${
            course.checkboxState === "checked" ? chalk.blue('CHECKED') : 
            course.checkboxState === "unchecked" ? chalk.yellow('UNCHECKED') : 
            chalk.red('NOT FOUND')
          }\n` +
          `  onclick: ${chalk.cyan(course.onclick)}`
        ).join('\n\n'),
        "All Courses Status"
      );

      // Step 11: Send email summary
      stagehand.log({ category: "email", message: "Preparing email summary" });
      
      // Create email summary
      const emailBody = `
        <h2>🎯 PEC Course Monitor Summary</h2>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>🎯 Special Priority Course: CS6701 COMPUTER NETWORKS</h3>
        <ul>
          <li><strong>Visible:</strong> ${isVisible ? 'YES' : 'NO'}</li>
          <li><strong>Selectable:</strong> ${isSelectable ? 'YES' : 'NO'}</li>
          <li><strong>Checkbox State:</strong> ${checkboxState.toUpperCase()}</li>
        </ul>
        
        <h3>📋 All Courses Summary (${allCourses.length} total)</h3>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="padding: 8px; text-align: left;">Course Code</th>
              <th style="padding: 8px; text-align: left;">Course Name</th>
              <th style="padding: 8px; text-align: center;">Visible</th>
              <th style="padding: 8px; text-align: center;">Selectable</th>
              <th style="padding: 8px; text-align: center;">Checkbox</th>
            </tr>
          </thead>
          <tbody>
            ${allCourses.map(course => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${course.courseCode}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${course.courseName}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${course.isVisible ? 'green' : 'red'};">${course.isVisible ? 'YES' : 'NO'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${course.isSelectable ? 'green' : 'red'};">${course.isSelectable ? 'YES' : 'NO'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${course.checkboxState.toUpperCase()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <p><em>This is an automated summary from your PEC Course Monitor Scout.</em></p>
      `;

      // Send email to both addresses
      const emailAddresses = ['sarthakkapila1@gmail.com', 'ekomsaidha1@gmail.com'];
      
      for (const email of emailAddresses) {
        try {
          await sendEmail({
            email: email,
            subject: `PEC Course Monitor - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            body: emailBody
          });
          announce(`📧 Email summary sent to ${email}`, "Email Notification");
        } catch (error) {
          stagehand.log({ category: "error", message: `Failed to send email to ${email}: ${error}` });
          announce(`❌ Failed to send email summary to ${email}`, "Email Error");
        }
      }
      
      // Logout to keep the session clean
      stagehand.log({ category: "action", message: "Logging out" });
      try {
        await page.act("Click on the logout button or link");
        await page.waitForTimeout(2000);
      } catch (error) {
        stagehand.log({ category: "warning", message: "Couldn't find logout button, continuing anyway" });
      }
      
      // Wait for the next check interval
      announce(`Next check in ${CHECK_INTERVAL_MS / 60000} minutes`, "Schedule");
      await page.waitForTimeout(CHECK_INTERVAL_MS);
      
    } catch (error: any) {
      announce(`Error: ${error.message}\nRetrying in 1 minute...`, "Error");
      await page.waitForTimeout(60000); // Wait 1 minute before retrying
    }
  }
}

/**
 * This is the main function that runs when you do npm run start
 */
async function run() {
  const stagehand = new Stagehand({
    ...StagehandConfig,
  });
  await stagehand.init();

  if (StagehandConfig.env === "BROWSERBASE" && stagehand.browserbaseSessionID) {
    console.log(
      boxen(
        `View this session live in your browser: \n${chalk.blue(
          `https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
        )}`,
        {
          title: "Browserbase",
          padding: 1,
          margin: 3,
        },
      ),
    );
  }

  const page = stagehand.page;
  const context = stagehand.context;
  
  announce("Starting PEC Course Monitor", "Scout System");
  
  try {
    await monitorCourseAvailability({
      page,
      context,
      stagehand,
    });
  } catch (error) {
    console.error(chalk.red("Fatal error:"), error);
  } finally {
    rl.close(); // Close readline interface
    await stagehand.close();
    console.log("Stagehand closed");
  }
}

run();
