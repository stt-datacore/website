export default  {
	light: {
		background: '#ffffff',
		axis: {
			domain: {
				line: {
					strokeWidth: 0,
					stroke: '#889eae'
				}
			},
			ticks: {
				line: {
					strokeWidth: 1,
					stroke: '#889eae'
				},
				text: {
					fill: '#6a7c89',
					fontSize: 11
				}
			},
			legend: {
				text: {
					fill: '#889eae',
					fontSize: 12,
					fontWeight: 500
				}
			}
		},
		legends: {
			text: {
				fontSize: 12
			}
		},
		tooltip: {
			container: {
				fontSize: '13px'
			}
		},
		labels: {
			text: {
				fill: '#555'
			}
		}
	},
	dark: {
		background: '#212d37',
		axis: {
			domain: {
				line: {
					strokeWidth: 0,
					stroke: '#677c8f'
				}
			},
			ticks: {
				line: {
					strokeWidth: 1,
					stroke: '#677c8f'
				},
				text: {
					fill: '#677c8f',
					fontSize: 11
				}
			},
			legend: {
				text: {
					fill: '#bcc5ce',
					fontSize: 12,
					fontWeight: 500
				}
			}
		},
		grid: {
			line: {
				stroke: '#444'
			}
		},
		legends: {
			text: {
				fontSize: 12,
				fill: '#bcc5ce'
			}
		},
		tooltip: {
			container: {
				fontSize: '13px',
				background: '#000',
				color: '#ddd'
			}
		},
		labels: {
			text: {
				fill: '#ddd',
				fontSize: 12,
				fontWeight: 500
			}
		},
		dots: {
			text: {
				fill: '#bbb',
				fontSize: 12
			}
		}
	}
};
