import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The list of Google Doc IDs extracted from the 53 links you provided
const FORM_DOC_IDS = [
  '1mI0Z_FZr7_LB6rtWHl1bG7fJ3ITEFf7AG4tAyf5-5GA', // 1
  '1B8zBiGjz_OQlIfqmIdCuGPisXKVI9byNsVySNviO3To', // 2
  '1r9vD2Eij9l66pfl3hbDjdDshI0OtDD5hrQYg3oaPL1E', // 3
  '1wiAnN_TLwylvtAzC48TvyDxC5a56IGxEQoLkmQGLQHk', // 5
  '1glp-G-vhb2u3Uqo3lcB_eHRxFatBEvwi93ciUT-Z-_4', // 6
  '1l7b08IursrEe_1OV2B25JFm4sa6F1pJ-MfNPzOMtMvE', // 7
  '11iyRKgSeYpsQFLagBVJXIXDS6K4UVc8MIysgO0gE81E', // 8
  '1nLkD3-CLyQnBk7ZxZHvLjBz5H3ALusWcx13HJi1qoRg', // 9
  '189p49XzjIJfC-QbR1QF9hFLNjqeb3Gw1JR8vCsQ6_HI', // 10
  '18sarZgtIsauheROY0kyZSh7f-2DWujq7-TBc8jRTUoI', // 11
  '1GMfXRNXJ1HugYpBwx1E97p6lFx_Blt086LdofruV1rI', // 12
  '1grMSBFk0x0m5EDdxu0p5ZLUGYKJXmqLBuyIBcFJi-ZE', // 13
  '1bmZDndtI6ANd92TI_868FvlPCbTLQVw03wP42AO76NA', // 15
  '1TbHf8OkMgCgf0G5Lp15hEHMbvJnfd3NJOjsNgbkheT0', // 16
  '1TpGrPjzj7uqkcaetO45kg_LWHFcntbYzJslAjB_ZwRk', // 17
  '1l8dHVXkTlBm2-Cq61-tICXt5bAh7NV-BIUS39c7DnQg', // 18
  '1r9GkaqP09au8M6o8drr-5Wyj1SxWwXucp9VlgzzhG5o', // 19
  '14_O82GGHcp3YRdCDbt8uArCXWv5ZOXfgIZZfhHSKcJY', // 20
  '1GmBa0psz4AFMvRryjnA7RdknOxuiL0upAcJ80kzznps', // 21
  '1qxTHGiBRoJWvYgObsKZGnsjAfT7zYf9k0eLNFPzz954', // 23
  '1nw5o4hFIbIFUsSA5lemmvT0Ewpg1fBGhGGTS3T0-lGI', // 25
  '16Ec15rPOXyE-Ywrv893U6uM9EWDzNAhmjTIwZTsUOyg', // 26
  '1qb9QHjV2mIzqd1D5xc_yjQHu4ZcJQQpKrezpI0K1bls', // 27
  '1MWa3i75sne02qbC9CAVCFdqs4Y_tszSKX8340qvwajI', // 28
  '1Jd46E7Rr6cgl2ssDuLjyvPTsTs2GnExNiXUKqdsUd0Y', // 29
  '1MbYSVWfeWWvujZNjwTXy4CCEbkQM9XxD0YQEqypzoew', // 30
  '1fgRP2YBMjHPmCYyIVLUvveknpexgUv1m6ADxKHMeKgo', // 31
  '1xT6fDoTum4wV_iwLJsBxub4qnCzF_22nM-yLZHKuzbA', // 32
  '1la6RnQpmB3cLA47A3Sh8I13lMdm97BnBq7xYjoikT8A', // 33
  '1jhcVI936pXVHz7M9TJX6bh96vy0XYfK9xT-GyZyFIwA', // 34
  '1QldRp4LpNReQH-pltmRAUkzNeMjkiUCJzA-iodS7u5E', // 35
  '1hnWK6QkuxC_yc1NvsoNE8PAyE_swEI3o7_xT40-aQYM', // 36
  '1BZohdwWLkw5q--FF_SP1Q1GFR5HNhU3y85jf39OTjeM', // 37
  '1yqzgCfspsbBkG65luFYPK68tmONBV6sak5U-N2ZLD7w', // 38
  '1RluOtk6pMMhCNwP9zwtMxinA1AN57NSkCIBchyfpl_A', // 39
  '1GfU0AiF-vldNKhSgQrB2aJlvctOpnY3GQeZ14QM0J6Y', // 40
  '1G2HFo9dbT4OkhaJ8Uigmax6n_UtGItJ7M1NVl4tHV-8', // 41
  '1-vK7REK7IrVXivDJ_rdKTkfPF6p0NPUdfo_WIYl7NzU', // 42
  '191FIUkJaj2577eCA4w_z8cyKWxV4m_XxV4-AVDp_hyU', // 43
  '1GRg10Fi5JZfn4SREh1AKJoDPKh5mrSP4XquCTdtEpXQ', // 44
  '1yZxDkH5g9KL5QaN2mnFiVlBBqs0V4X521LgJe6Pm_b4', // 45
  '11f6C23GmBD_m3BaYQvyJHEi3SN8AYp4HJyVm32HVq7g', // 46
  '1GzbWFdWHhasiggvLBAZ5IkXUDJ0PMVtXI5W9sl4_so0', // 47
  '1HL502wLVKFjTYhfEVw8B6X0mtETRRIGa1q2udtCb7-w', // 48
  '1zHH2UPwV1IfKz7FmRJJDe9bPNNI6G0_9aSbPOYr0h3A', // 49
  '1z6I7ZzF4Or0yFEdlxz6pBcPNYjk0pIDfsZ3NqD6cwnY', // 50
  '1EXXtiQ3FNNxMeOAlmBgA4sEFVhXkMFabBXraFl89Q3E', // 51
  '1YLiM37ZAYMhdR9LyxFc_-LaTgeQucLuK97dU5G4xPew', // 52
  '1O15b3eEbbqCjhaiIuYLzbcoFXjV-I_be-zsDEg-tv5U'  // 53
];

const SYSTEM_PROMPT = `
You are an expert React and Next.js developer. 
I will give you the raw text from a physical paper form. 
Your job is to convert it into a beautiful React component using our exact design system.

Rules:
1. ONLY output the raw TypeScript (TSX) code for the file. No markdown formatting, no explanations.
2. Use the imported fields: import { TextField, TextareaField, SelectField, PhoneField, FormSection, FormActions } from './FormField';
3. You must write a functional React component named \`FormXXTitle\` (e.g. Form09Declaration).
4. Extract all logical input fields from the text.
5. Create a \`FormXXData\` interface for the state.
`;

async function main() {
  console.log("Starting Mass Digitalization of 53 Forms...");
  const outDir = path.join(process.cwd(), 'src/components/forms/generated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < FORM_DOC_IDS.length; i++) {
    const docId = FORM_DOC_IDS[i];
    const formNumber = i + 1; // Approx mapping
    const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    
    try {
      console.log(`Fetching Form Data from Google Doc [${docId}]...`);
      const response = await fetch(url);
      const text = await response.text();

      console.log(`Sending Form ${formNumber} to AI for component generation...`);
      const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4000,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Please digitise this form:\n\n${text}` }
        ]
      });

      const code = (msg.content[0] as any).text.trim().replace(/^```tsx|^```|```$/g, '');
      const fileName = `Form_Auto_${formNumber}.tsx`;
      fs.writeFileSync(path.join(outDir, fileName), code);
      console.log(`✅ Successfully generated and saved ${fileName}`);
      
      // Delay to respect API rate limits
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`❌ Failed to generate form ${formNumber}:`, e);
    }
  }
  
  console.log("Digitalization complete! Check src/components/forms/generated");
}

main().catch(console.error);
