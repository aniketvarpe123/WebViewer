// src/main.ts
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module'; // Adjust the path based on your project structure
// import { environment } from './environments/environment';

// if (environment.production) {
//   enableProdMode();
// }

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
