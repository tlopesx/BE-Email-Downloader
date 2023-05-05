function onGmailMessageSelected(event) {
  var card = createCard();
  return [card.build()];
}

function createCard() {
  var cardBuilder = CardService.newCardBuilder();

  var projectCodeSection = CardService.newTextInput()
    .setFieldName("projectCode")
    .setTitle("Project Code")
    .setSuggestions(CardService.newSuggestions()
      .addSuggestions(getProjectCodeArray()));

  var correspondenceDropdown = CardService.newSelectionInput()
    .setFieldName("correspondenceType")
    .setTitle("Correspondence Type")
    .setType(CardService.SelectionInputType.RADIO_BUTTON)
    .addItem("In", "In", true)
    .addItem("Out", "Out", false);
    // .setOnChangeAction(CardService.newAction().setFunctionName("onCorrespondenceTypeChange"));

  var senderSection = CardService.newTextInput()
    .setFieldName("sender")
    .setTitle("Sender");

  var subjectSection = CardService.newTextInput()
    .setFieldName("subject")
    .setTitle("Subject");

  var attachmentsCheckbox = CardService.newSelectionInput()
    .setFieldName("saveAttachments")
    .setTitle("Attachments")
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .addItem("Save Attachments", "1", true);

  var saveButton = CardService.newTextButton()
    .setText("SAVE")
    .setOnClickAction(CardService.newAction().setFunctionName("saveEmail"));

  cardBuilder.addSection(CardService.newCardSection()
    .setHeader("Email Information")
    .addWidget(projectCodeSection)
    .addWidget(senderSection)
    .addWidget(subjectSection));

  cardBuilder.addSection(CardService.newCardSection() 
    .addWidget(correspondenceDropdown));

  cardBuilder.addSection(CardService.newCardSection()
    .addWidget(attachmentsCheckbox));

  cardBuilder.setFixedFooter(CardService.newFixedFooter()
    .setPrimaryButton(saveButton));

  return cardBuilder;
}

function onCorrespondenceTypeChange(e) {
  var card = createCard();
  var inputs = e.formInput;
  var correspondenceType = inputs.correspondenceType;

  if (correspondenceType === "Out") {
    card.sections[0].removeWidget(2); // Remove sender input
  }

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card.build()))
    .build();
}


function saveEmail(event) {
  var formInputs = event.formInput;
  var projectCode = formInputs.projectCode;
  var correspondenceType = formInputs.correspondenceType;
  var sender = formInputs.sender;
  var subject = formInputs.subject;

  // Get the current email message
  var messageId = event.gmail.messageId;
  var message = GmailApp.getMessageById(messageId);

  // Get the sent or received date of the email
  var emailDate = message.getDate();
  var formattedDate = Utilities.formatDate(emailDate, 'GMT', 'yyMMdd');

  // Define the email folder name based on the correspondence type
  var emailFolderName = (correspondenceType === 'In') ? formattedDate + '_' + sender + '_' + subject
                                                      : formattedDate + '_' + subject;

  // Create the subfolders and get the destination folder
  var emailFolder = createCommunicationsFolder(projectCode, emailFolderName, correspondenceType);

  // Save the email message
  saveMessageToDrive(message, emailFolder);

  var notification = CardService.newNotification()
    .setText("Email saved successfully.");
  return CardService.newActionResponseBuilder()
    .setNotification(notification)
    .build();
}

function createCommunicationsFolder(project, folderName, correspondenceType) {
  var BEProjectsFolder = DriveApp.getFolderById("0AKHSXuv8z3hQUk9PVA");
  var year = "20".concat(project.substring(0, 2));

  var date = Utilities.formatDate(new Date(), "GMT+0", "yyMMdd")

  var projectFolder = BEProjectsFolder.getFoldersByName(year).next().getFoldersByName(project).next();

  if (year < 2020){
      var correspondenceFolder = (correspondenceType === 'In') ? projectFolder.getFoldersByName("Communications").next().getFoldersByName("CA Phase").next().getFoldersByName("Correspondence").next().getFoldersByName("In").next()
                                                               : projectFolder.getFoldersByName("Communications").next().getFoldersByName("CA Phase").next().getFoldersByName("Correspondence").next().getFoldersByName("Out").next();
  }
  else {
      var correspondenceFolder = (correspondenceType === 'In') ? projectFolder.getFoldersByName("1.2  Communications").next().getFoldersByName("Correspondence").next().getFoldersByName("In").next()
                                                               : projectFolder.getFoldersByName("1.2  Communications").next().getFoldersByName("Correspondence").next().getFoldersByName("Out").next();
  }

  return correspondenceFolder.createFolder(folderName);
}

function getProjectCodeArray() {
  var BEProjectsFolder = DriveApp.getFolderById("0AKHSXuv8z3hQUk9PVA");
  var currentDate = new Date();
  var currentYear = currentDate.getFullYear();
  var projectCodes = [];

  for (var year = currentYear; year >= currentYear - 4; year--) {
    var yearFolder = BEProjectsFolder.getFoldersByName(year.toString());

    if (yearFolder.hasNext()) {
      var projectsFolder = yearFolder.next();
      var projects = projectsFolder.getFolders();

      while (projects.hasNext()) {
        var projectFolder = projects.next();
        projectCodes.push(projectFolder.getName());
      }
    }
  }

  return projectCodes;
}


function findOrCreateFolder(path, parentFolder) {
  var folders = path.split('/');
  var currentFolder = parentFolder || DriveApp.getRootFolder();

  for (var i = 0; i < folders.length; i++) {
    var folderName = folders[i];
    var nextFolder = currentFolder.getFoldersByName(folderName).next();

    if (!nextFolder) {
      nextFolder = currentFolder.createFolder(folderName);
    }

    currentFolder = nextFolder;
  }

  return currentFolder;
}

function saveMessageToDrive(message, folder) {
  var rawContent = message.getRawContent();
  var blob = Utilities.newBlob(rawContent, 'message/rfc822', message.getSubject() + '.eml');
  folder.createFile(blob);

  // Save attachments
  var attachments = message.getAttachments();
  for (var i = 0; i < attachments.length; i++) {
    var attachment = attachments[i];
    folder.createFile(attachment);
  }
}


function onGmailMessageCompose(event) {
  return CardService.newComposeActionResponseBuilder()
    .setGmailDraft(Gmail.newDraft()
      .to(event.recipients)
      .subject(event.subject)
      .body(event.body))
    .build();
}
