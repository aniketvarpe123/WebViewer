/* 
   Aniket Varpe: 07 March,2024 
   Apryse WebViewer Links: https://docs.apryse.com/documentation/web/guides/hiding-elements/
*/

import { AfterViewInit, Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import WebViewer, { WebViewerInstance } from "@pdftron/webviewer";
import { Subject } from "rxjs";
import { PDFNet } from '@pdftron/pdfnet-node';

// Declare CSConfig globally or define it somewhere in your code

const CSConfig = {
  CSUrl: 'http://eimsdemo.mannaicorp.com.qa/otcs/cs.exe', // Replace with your content server URL
  Otcsticket: '',  // Add the authentication token property
};

@Component({
  selector: 'app-root',
  styleUrls: ['app.component.css'],
  templateUrl: 'app.component.html'
})
export class AppComponent implements AfterViewInit {
  wvInstance?: WebViewerInstance;
  @ViewChild('viewer', { static: true }) viewer!: ElementRef;
  private documentLoaded$: Subject<void> = new Subject<void>();
  private isWebViewerInitialized = false;
  private isDocumentLoaded = false;

  constructor(private renderer: Renderer2, private http: HttpClient) {}

  ngAfterViewInit(): void {
    if (!this.isWebViewerInitialized) {
      this.initializeWebViewer();
      this.isWebViewerInitialized = true;
    }
  }

  async initializeWebViewer(): Promise<void> {
    try {
      // Authentication
      const authResponse = await fetch(
        `${CSConfig.CSUrl}/api/v1/auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: 'admin',
            password: 'P@ssw0rd',
          }),
        }
      );

      if (!authResponse.ok) {
        throw new Error(`Authentication failed with status ${authResponse.status}`);
      }

      const authData = await authResponse.json();

      CSConfig.Otcsticket = authData['ticket'];  // Set the authentication token

      // Logging the authentication token for debugging purposes
      console.log('AuthToken:', CSConfig.Otcsticket);

      // Continue with WebViewer initialization
      const fileBlob = await this.generateAuthenticatedFileBlob(CSConfig);
    
     
      // Determine the file extension based on its MIME type
      const fileExtension = fileBlob.type.startsWith('application/pdf') ? 'pdf' : 'docx';

      WebViewer({
        path: '../lib',
      }, this.renderer.selectRootElement(this.viewer.nativeElement)).then(instance => {
        this.wvInstance = instance;

        // Load the document dynamically based on its file extension
        instance.UI.loadDocument(this.createBlobUrl(fileBlob), { extension: fileExtension });

        // Accessing WebViewer Core
        const { Core } = instance;

        // Hide the left panel and left panel button
        instance.UI.disableElements(['leftPanel', 'leftPanelButton']);
        instance.UI.disableElements(['menuButton', 'menuButton']);
        instance.UI.disableElements(['viewControlsButton', 'viewControlsButton']);

        // Add header button for exporting annotations
        instance.UI.setHeaderItems(header => {
          header.push({
            //type: 'actionButton',
           // img: '...', // Replace with the appropriate image URL or icon class
            onClick: async () => {
              const doc = Core.documentViewer.getDocument();
              const annotationManager = Core.annotationManager;
              const xfdfString = await annotationManager.exportAnnotations();
              const data = await doc.getFileData({
                xfdfString
              });
              const arr = new Uint8Array(data);
              const blob = new Blob([arr], { type: 'application/pdf' }); // Adjust for DOCX file

              // Trigger download
              // this.downloadFile(blob, `02_Project.${fileExtension}`);
              this.downloadFile(blob, `02_Project`);
            }
          });
        });

        // Add event listener for annotations loaded
        Core.documentViewer.addEventListener('annotationsLoaded', () => {
          console.log('Annotations loaded');
        });

        // Add event listener for document loaded
        Core.documentViewer.addEventListener('documentLoaded', () => {
          // Mark the document as loaded
          this.isDocumentLoaded = true;
          this.documentLoaded$.next();

          // Add a rectangle annotation (if needed)
          // ...
        });
      });
    } catch (error) {
      console.error('Authentication error:', error);
      // Handle the authentication error, e.g., redirect to login page or display an error message
    }
  }

  async generateAuthenticatedFileBlob(CSConfig: any): Promise<Blob> {
    console.log('AuthToken - generateAuthenticatedFileBlob:', CSConfig.Otcsticket);
    const url = `${CSConfig.CSUrl}/api/v1/nodes/3161737/content?Otcsticket=${CSConfig.Otcsticket}`;

    // Only make the request if the document is not already loaded
    if (!this.isDocumentLoaded) {
      const headers = new HttpHeaders({
        'Otcsticket': CSConfig.Otcsticket,
      });

      try {
        const response = await this.http.get(url, { headers, responseType: 'blob' }).toPromise();
        console.log("Line 142 :",response);

        return response as Blob;
      } catch (error) {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            console.error('401 Unauthorized - Invalid authentication token or credentials');
          } else {
            console.error('Error:', error);
          }
        } else {
          console.error('Unexpected error:', error);
        }

        throw error; // Re-throw the error to propagate it further if needed
      }
    }

    // If the document is already loaded, return an empty Blob or handle it as needed
    return new Blob();
  }

  createBlobUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  // Method to trigger the download
  downloadFile(blob: Blob, filename: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Method to save changes as PDF (called on "Save" button click)
  saveChangesAsPDF(): void {
    // Add any logic here if needed before triggering the export
    // For example, you may want to perform some actions or validations before exporting annotations.

    // Trigger the export of annotations (same logic as in the header button)
    if (this.wvInstance) {
      const { Core } = this.wvInstance;
      const doc = Core.documentViewer.getDocument();
      const annotationManager = Core.annotationManager;
      annotationManager.exportAnnotations().then(async (xfdfString) => {
        const data = await doc.getFileData({
          xfdfString
        });
        const arr = new Uint8Array(data);
        const blob = new Blob([arr], { type: 'application/pdf' });

        // Trigger download
        this.downloadFile(blob, 'document.pdf');
      });
    }
  }

  addVersion(): void {
    if (this.wvInstance) {
      const { Core } = this.wvInstance;
      const doc = Core.documentViewer.getDocument();
      const annotationManager = Core.annotationManager;

      annotationManager.exportAnnotations().then(async (xfdfString) => {
        const data = await doc.getFileData({
          xfdfString
        });

        const nodeId = '3161737'; // Replace with the actual nodeId

        // Convert ArrayBuffer to Uint8Array
        const uint8ArrayData = new Uint8Array(data);

        // Get the original file
        // const originalFile = (await this.http.get(`${CSConfig.CSUrl}/api/v1/nodes/${nodeId}`, {
        //   headers: {
        //     'Otcsticket': CSConfig.Otcsticket,
        //   },
        //   responseType: 'arraybuffer'
        // }).toPromise()) as ArrayBuffer;

        // Call a method to send the file and versioning details to the content server
        this.addVersionToContentServer(nodeId, uint8ArrayData);
      });
    }
  }

  private async addVersionToContentServer(
    nodeId: string,   
    fileData: Uint8Array
  ): Promise<void> {
    const contentServerUrl = `${CSConfig.CSUrl}/api/v2/nodes/${nodeId}/versions`;

    console.log("line210 : contentServerUrl: ", contentServerUrl);
    console.log("line211 : Otcsticket: ", CSConfig.Otcsticket);

    // Customize headers or parameters as needed for your content server API
    const headers = new HttpHeaders({
      'Otcsticket': CSConfig.Otcsticket, // Add the authentication token
      // Add any other headers as needed
    });

    const formData = new FormData();
    formData.append('file', new Blob([fileData], { type: 'application/pdf' }));
    // formData.append('upload_key', ''); // Add upload key if needed
    // formData.append('description', 'Your Version Description'); // Add version description
    // formData.append('add_major_version', 'true'); // Indicate whether it is a major version
    // formData.append('external_create_date', '2024-02-14'); // Add external create date if needed (replace with the actual date)
    // formData.append('external_modify_date', '2024-02-14'); // Add external modify date if needed (replace with the actual date)
    // formData.append('external_source', 'Your External Source'); // Add external source if needed
    // formData.append('external_identity', 'Your External Identity'); // Add external identity if needed
    // formData.append('external_identity_type', 'Your Identity Type'); // Add external identity type if needed
    // formData.append('original_file', new Blob([originalFile], { type: 'application/pdf' }));

    try {
      // Make a POST request to add a version to your content server
      const response = await this.http.post(contentServerUrl, formData, { headers }).toPromise();

      console.log('Line 247');

      // Handle the response as needed
      console.log('Version successfully added to the content server:', response);
    } catch (error) {
      // Handle errors
      console.error('Error adding version to the content server:', error);
    }
  }
}
