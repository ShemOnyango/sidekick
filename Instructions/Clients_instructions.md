```markdown
# Rail Authority Awareness & Navigation Platform - Client Requirements Summary

## Overview

Review the video. Essentially looking for an app that can be downloaded to Apple/Android that can navigate to railroad locations and navigate to them. It needs to have a follow me feature, have offline versions that like agencies and subdivisions can be downloaded prior to not having cell service etc.

## Core Features Required

### 1. Proximity Alert System
One of the key changes that it needs to have is the ability to sense when other people using the app are within a .25 .5 .75 1 mile range that it sends an alert.

### 2. Authority Input System
For example on railroads users receive authority to get on the track. The user should be able to input their authority at a high level:

**Authority Fields:**
- Subdivision 
- Begin Milepost
- End Milepost
- Track Type
- Track Number

### 3. Real-World Example
so a real world example of this feature would be if I get the following authority:
```
Employee Name: Ryan Medlin
Employee Cell Number: XXXXXXXXXXX
Subdivision: Medlin
Begin Milepost: 1
End Milepost: 7
Track Type: Main
Track Number: 1
```

**Functionality:**
Then it will follow me and send an alert when I am within 0.5 miles from either end of my min/Max authority limits until I get outside of the 0.5 mile range.

### 4. Overlap Detection
The other piece is that if someone else gets the same authority it will send an alert informing them that someone else has overlapping limits with them and display their name and contact number that they filled out when they input their authority and then alert them if they get within the .25 .5 .75.

## Client Involvement & Customization

This is extremely high level and I would want to make sure that I am involved in all naming conventions etc, the UI, and then be able to take this over and scale it easily as we get new customers, opportunities

## Additional Feature Request

Another feature that I forgot is we would be able to drop multiple pin drops and email like a list at the end of the trip it would be dropdowns like:

**Default Pin Drop Categories:**
- Scrap - rail
- Scrap - ties
- Monitor location

**Customization Requirement:**
Etc but allow me to go in to the code and customize more drop downs etc. all of the fields must be modifiable

## Comprehensive Customization Requirement

everything would need to be customizable, the alert distances, the number of alerts etc. Because each agency is different. I would also need to be able to change the color of the app to match our company colors etc,.

## Additional Context from Client

I added some follow up to your points. I put my comments in blue. Leverage the Video I sent. The missing piece to that video is the authority and offline etc. Take a look. I leave Next Thursday for vacation and will be out of pocket for a week. I want to see a working demo that has the functionality built in that I can test. I added the logo files

## Developer Note

Now those are the instructions from client. The doc Rail Authority Awareness am the one who created in trying to understand the task. The doc screenshots am also the one who created, there was a video provided but I decided to take the screenshots so that we could visualize everything well. The remaining doc was provided by the client.

The screenshots.pdf contains all the screenshot from the video
```