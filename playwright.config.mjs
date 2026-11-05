import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'test-browser',use:{browserName:'chromium',acceptDownloads:true},reporter:'list'});
