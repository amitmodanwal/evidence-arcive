# Sākṣya Case Hub

https://image-spark-analysis.lovable.app         ye mera website hai isme ye add karo - Add a complete Case Evidence & Investigation Management feature to the Sākṣya website.

1. Evidence Upload & Management

Create a secure evidence section where authorized investigators can add, organize, preview, and manage:

Audio recordings

PDFs and other documents

Witness statements

FIR / case reports

Call records and metadata, only when legally obtained

Vehicle information

Suspect information

Victim information

Locations

Dates and times

2. Case Evidence Dashboard

For every case, create an evidence dashboard showing:

Total evidence items

Evidence type

Upload date/time

Evidence source

Related person

Related location

Case status

Verification status

Allow filtering by evidence type, date, person, and location.

3. Evidence Upload

Create an upload interface with:

Drag-and-drop file upload

File type validation

File size validation

Evidence title

Description

Evidence category

Source

Date/time

Location

Related suspect/victim/witness

Case ID

Optional notes

Store files securely and store their metadata in the database.

4. Evidence Detail Page

When an investigator opens an evidence item, show:

File/document/audio preview where supported

Evidence metadata

Related people

Related locations

Timeline information

Notes

Upload history

Verification status

For audio, provide a secure audio player. For PDFs/documents, provide a secure preview/download option.

5. Case Timeline

Automatically create a chronological timeline using:

FIR/case report dates

Witness statement dates

Audio recording timestamps

Call-record metadata timestamps

Evidence upload dates

Important incident dates

Location information

Display the timeline in an easy-to-understand visual interface.

6. People & Vehicle Information

Create structured sections for:

Suspect

Name

Contact information

Identification/reference number

Related evidence

Related locations

Notes

Victim

Name

Contact/reference information

Related evidence

Related locations

Notes

Witness

Name

Contact/reference information

Statement

Statement date

Related evidence

Vehicle

Registration number

Vehicle type

Make/model

Color

Owner/reference information

Related case/evidence

Relevant locations

7. Location Mapping

Allow investigators to associate evidence and people with locations.

Show authorized case locations on an interactive map and display:

Location

Date/time

Related evidence

Related people

Case events

Do not expose sensitive case/location information publicly.

8. Security & Privacy

Implement strict access control.

Only authenticated and authorized users should be able to access case evidence.

Add:

Role-based access control

Secure file storage

Database access policies

Audit logs

Evidence access history

Upload/delete/update history

No sensitive evidence in frontend source code

No public file URLs for sensitive evidence

Call records and other sensitive information must only be stored/processed when legally obtained and authorized.

9. Database

Create proper relational database tables/models for:

cases

evidence

evidence_files

witness_statements

suspects

victims

witnesses

vehicles

locations

case_events

audit_logs

Create proper relationships using case IDs and foreign keys.

10. UI

Maintain the existing Sākṣya design system.

Create a professional investigation dashboard with:

Evidence cards

Case timeline

Search and filters

Upload modal

Evidence detail drawer/page

People section

Vehicle section

Location/map section

Audit history

Make the UI responsive for desktop and tablet.

Do not break the existing login, authentication, database, or deployment functionality. Reuse the existing backend/database and authentication system wherever possible.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://evidence-arcive.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/59255fb4-7a05-451a-bf94-55142e0ccfc1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
