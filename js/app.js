(function() {

  'use strict';

  var ENTER_KEY = 13;
  var newEntityDom = document.getElementById('new-entity');
  var syncDom = document.getElementById('sync-wrapper');

  // Set the PouchDb database.
  var db = new PouchDB('qwerty');
  // Set the workspace used for replication in Drupal 8.
  var remoteCouch = new PouchDB('http://admin:admin@drupal8.loc/relaxed/default');
  // Set the entity type id.
  var entity_type = 'entity_test';

  //PouchDB.debug.enable('*');
  //PouchDB.debug.enable('pouchdb:api');
  //PouchDB.debug.enable('pouchdb:http');

  db.changes({
    since: 'now',
    live: true
  }).on('change', showEntities);

  function addEntity(text) {
    var name = [{'value' : text}];
    var entity = {
      _id: entity_type + '.' + PouchDB.utils.uuid(),
      name: name,
      type: entity_type
    };
    db.put(entity, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted a entity!');
      }
    });
  }

  // Show the current list of entities by reading them from the database
  function showEntities() {
    db.allDocs({include_docs: true, descending: true}, function(err, doc) {
      redrawEntitiesUI(doc.rows);
    });
  }

  function checkboxChanged(entity, event) {
    entity.completed = event.target.checked;
    db.put(entity);
  }

  // User pressed the delete button for a entity, delete it
  function deleteButtonPressed(entity) {
    db.remove(entity);
  }

  // The input box when editing a entity has blurred, we should save
  // the new title or delete the entity if the title is empty
  function entityBlurred(entity, event) {
    var trimmedText = event.target.value.trim();
    if (!trimmedText) {
      db.remove(entity);
    } else {
      entity.name[0].value = trimmedText;
      db.put(entity);
    }
  }

  // Initialise a sync with the remote server
  function sync() {
    syncDom.setAttribute('data-sync-state', 'syncing');
    var opts = {live: true};
    db.replicate.to(remoteCouch, opts, function (err, result) {
    }).on('error', function (err) {
      console.log(err);
      syncError();
    });
    db.replicate.from(remoteCouch, function (err, result) {
    }).on('error', function (err) {
      console.log(err);
      syncError();
    });

  }

  function syncError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }

  function entityDblClicked(entity) {
    var div = document.getElementById('li_' + entity._id);
    var inputEditEntity = document.getElementById('input_' + entity._id);
    div.className = 'editing';
    inputEditEntity.focus();
  }

  function entityKeyPressed(entity, event) {
    if (event.keyCode === ENTER_KEY) {
      var inputEditEntity = document.getElementById('input_' + entity._id);
      inputEditEntity.blur();
    }
  }

  function createEntityListItem(entity) {
    var checkbox = document.createElement('input');
    checkbox.className = 'toggle';
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', checkboxChanged.bind(this, entity));

    var label = document.createElement('label');
    label.appendChild( document.createTextNode(entity.name[0].value));
    label.addEventListener('dblclick', entityDblClicked.bind(this, entity));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'destroy';
    deleteLink.addEventListener( 'click', deleteButtonPressed.bind(this, entity));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(checkbox);
    divDisplay.appendChild(label);
    divDisplay.appendChild(deleteLink);

    var inputEditEntity = document.createElement('input');
    inputEditEntity.id = 'input_' + entity._id;
    inputEditEntity.className = 'edit';
    inputEditEntity.value = entity.name[0].value;
    inputEditEntity.addEventListener('keypress', entityKeyPressed.bind(this, entity));
    inputEditEntity.addEventListener('blur', entityBlurred.bind(this, entity));

    var li = document.createElement('li');
    li.id = 'li_' + entity._id;
    li.appendChild(divDisplay);
    li.appendChild(inputEditEntity);

    if (entity.completed) {
      li.className += 'complete';
      checkbox.checked = true;
    }

    return li;
  }

  function redrawEntitiesUI(entities) {
    var ul = document.getElementById('entity-list');
    ul.innerHTML = '';
    entities.forEach(function(entity) {
      ul.appendChild(createEntityListItem(entity.doc));
    });
  }

  function newEntityKeyPressHandler( event ) {
    if (event.keyCode === ENTER_KEY) {
      addEntity(newEntityDom.value);
      newEntityDom.value = '';
    }
  }

  function addEventListeners() {
    newEntityDom.addEventListener('keypress', newEntityKeyPressHandler, false);
  }

  addEventListeners();
  showEntities();

  if (remoteCouch) {
    sync();
  }

})();
