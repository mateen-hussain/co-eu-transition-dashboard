const transformDeliveryConfidenceValue = (value) => {
    switch(value) {
    case 3:
      return `${value} - High confidence`;
    case 2:
      return `${value} - Medium confidence`;
    case 1:
      return `${value} - Low confidence`;
    case 0:
      return `${value} - Very low confidence`;
    default:
      return `No level given`;
    }
  }
  
  module.exports = {
    transformDeliveryConfidenceValue
  }