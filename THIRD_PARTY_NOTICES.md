# Third-party notices

Portions of this project are adapted from **langchain-ai/social-media-agent**
(https://github.com/langchain-ai/social-media-agent):

- `src/lib/platforms/linkedin.ts`: ugcPosts publishing and registerUpload image flow (from `src/clients/linkedin.ts`)
- `src/lib/platforms/x.ts`: posting and media upload via twitter-api-v2 (from `src/clients/twitter/client.ts`)
- `src/lib/ai.ts`: post structure, content rules and condense-post prompts (from `src/agents/generate-post/prompts` and `nodes/condense-post.ts`)
- `src/lib/queue.ts`: default posting-slot idea (from `src/utils/schedule-date`)

That project is distributed under the following license:

```
MIT License

Copyright (c) 2024 LangChain

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
