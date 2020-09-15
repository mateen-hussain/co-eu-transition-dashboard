/* eslint-disable no-undef */

const getTableauDataType = type => {
  switch (type) {
  case 'string':
    return tableau.dataTypeEnum.string
  case 'float':
    return tableau.dataTypeEnum.float
  case 'int':
    return tableau.dataTypeEnum.int
  case 'timestamp':
    return tableau.dataTypeEnum.datetime
  case 'bool':
    return tableau.dataTypeEnum.bool
  default:
    return tableau.dataTypeEnum.string
  }
}

// Tableau only allows the following regex items to be used as an ID
const formatKey = key => key.replace(/[^a-zA-Z0-9_]/g, '');

(function() {
  // Create the connector object
  var myConnector = tableau.makeConnector();

  // Define the schema
  myConnector.getSchema = function (schemaCallback) {
    $.getJSON(`${tableau.connectionData}/schema`, function (data) {
      var cols = [];
      for (const [key, value] of Object.entries(data)) {
        cols.push({
          id: formatKey(key),
          dataType: getTableauDataType(value.type),
          alias: key
        });
      }
  
      var tableSchema = {
        id: `${formatKey(tableau.connectionName)}feed`,
        alias: `${tableau.connectionName} feed`,
        columns: cols
      };
  
      schemaCallback([tableSchema]);
    });
  };

  myConnector.getData = function (table, doneCallback) {
    $.getJSON(`${tableau.connectionData}/data`, function (data) {
      var tableData = [];

      for (var i = 0, len = data.length; i < len; i++) {
        const tableEntry = {};
        for (const [key, entryValue] of Object.entries(data[i])) {
          tableEntry[formatKey(key)] = entryValue.value || entryValue
        }
        tableData.push(tableEntry);
      }
  
      table.appendRows(tableData);
      doneCallback();
    });
  };

  tableau.registerConnector(myConnector);

  $(document).ready(function () {
    $("#SubmitButton").click(function () {
      tableau.connectionData = $("#ConnectionURL").val();
      tableau.connectionName = $("#ConnectionName").val();
      tableau.submit();
    });
  });

  // alternatively you can skip the user interaction and have the function run on load
  // myConnector.init = function(initCallback) {
  //   tableau.connectionData = $("#ConnectionURL").val();
  //   tableau.connectionName = $("#ConnectionName").val();
  //   initCallback();
  //   tableau.submit();
  // };
})();