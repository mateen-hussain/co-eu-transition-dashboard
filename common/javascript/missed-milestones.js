(function (global) {
  var missedMilestoneChart = (elementId, data) =>  {
    var ctx = document.getElementById(elementId);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: "rgba(212,53,28, 0.5)"
        }]
      },
      options: {
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
              const meta = data.meta[tooltipItem[0].index];
              const percentMissed = Math.round((meta.totalMilestonesMissed / meta.totalMilestones) * 100);
              let toolTipText = [`${meta.totalMilestonesMissed} missed milestones from`];
              toolTipText.push(`${meta.totalMilestones} total milestones.`);
              toolTipText.push('');
              toolTipText.push(`${percentMissed}% missed from department portfolio`);
              return toolTipText;
            },
            label: () => {
              return false;
            }
          }
        },
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true
            }
          }]
        }
      }
    });
  };

  global.TRANSITIONDELIVERYDASHBOARD = global.TRANSITIONDELIVERYDASHBOARD || {};
  global.TRANSITIONDELIVERYDASHBOARD.missedMilestoneChart = missedMilestoneChart;
})(window);

