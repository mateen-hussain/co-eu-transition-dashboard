import moment from 'moment';
import Chart from 'chart.js';

const rowHeight = 8;
const xAxisLablesHeight = 10;

export default (elementId, data) =>  {
  const ctx = document.getElementById(elementId);
  ctx.height = xAxisLablesHeight + (data.data.length * rowHeight * 2);

  const addEllipsis = (string, maxLength = 30) => {
    let text = string.substr(0, maxLength);
    if(string.substr(maxLength, 1).length) {
      text += '...';
    }
    return text;
  }

  new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: [{
        radius: 10,
        hoverRadius: 15,
        data: data.data,
        backgroundColor: '#5694CA',
        hoverBackgroundColor: '#5694CA'
      }]
    },
    options: {
      layout: {
        padding: {
          top: 30,
          bottom: 30
        }
      },
      responsive: true,
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltips: {
        callbacks: {
          beforeBody: (tooltipItem) => {
            const item = tooltipItem[0];
            const meta = data.meta[item.index];

            let toolTipText = [`${meta.departmentName}`];
            toolTipText.push(`Project title: ${addEllipsis(meta.title, 50)}`);
            toolTipText.push(`Milestone description: ${addEllipsis(meta.milestoneDescription, 50)}`);
            toolTipText.push(`Due date ${moment(item.label, 'x').format('DD MMMM YYYY')}`);
            toolTipText.push(`Impact rating: ${meta.impact}`);
            toolTipText.push(`HMG Delivery Confidence: ${meta.hmgConfidence}`);

            return toolTipText;
          },
          label: () => {
            return false;
          }
        }
      },
      scales: {
        xAxes: [{
          ticks: {
            precision: 0,
            min: data.min,
            max: data.max,
            callback: function(value) {
              return moment(value, 'x').format('DD MMMM');
            }
          }
        }],
        yAxes: [{
          ticks: {
            beginAtZero: true,
            autoSkip: false,
            stepSize: 1,
            callback: function(value, index) {
              return addEllipsis(`${data.meta[index].departmentName}: ${data.meta[index].title}`);
            }
          }
        }]
      }
    }
  });
};
