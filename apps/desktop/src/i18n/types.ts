/**
 * Type definitions for i18n translations
 *
 * This module extends the i18next types to include our custom namespaces
 * and provides type safety for translation keys.
 */

import 'i18next';

// Define the shape of our translation resources
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      common: {
        app: {
          name: string;
          description: string;
        };
        menu: {
          file: string;
          edit: string;
          view: string;
          help: string;
        };
        sidebar: {
          newTask: string;
          settings: string;
          searchTasks: string;
          noConversations: string;
        };
        task: {
          title: string;
          description: string;
          status: string;
          running: string;
          queued: string;
          completed: string;
          error: string;
          cancelled: string;
        };
        buttons: {
          save: string;
          cancel: string;
          delete: string;
          edit: string;
          close: string;
          ok: string;
          yes: string;
          no: string;
          retry: string;
          copy: string;
          paste: string;
        };
        messages: {
          welcome: string;
          loading: string;
          error: string;
          success: string;
          warning: string;
          info: string;
        };
        settings: {
          title: string;
          aiProvider: string;
          apiKey: string;
          model: string;
          language: string;
          theme: string;
          debugMode: string;
          about: string;
          version: string;
        };
        home: {
          placeholder: string;
          examples: string;
          example1: string;
          example2: string;
          example3: string;
        };
        execution: {
          thinking: string;
          executing: string;
          completed: string;
          failed: string;
          output: string;
          logs: string;
        };
        errors: {
          generic: string;
          network: string;
          apiError: string;
          fileNotFound: string;
          permissionDenied: string;
        };
      };
    };
    defaultNS: 'common';
    returnNull: false;
    returnObjects: false;
  }
}

export {};
