async function loadJson(file) {
    jsondata = await fetch(file);
    json = await jsondata.json();
    console.log("loading"+file);
    return json;
}

async function loadJsonFiles(fileNames) {
    const fetchPromises = fileNames.map(fileName =>
        fetch(fileName).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${fileName}: ${response.statusText}`);
            }
            return response.json();
        })
    );

    const results = await Promise.all(fetchPromises);
    return results; // An array of parsed JSON objects
}

async function createGraph() {
    const s = 1.2;
    
    graph = await loadJson("./graph.json");
    
    const nodes = graph.nodes;
    const edges = graph.edges;

    clones = ["C1","I2", "B2", "B3", "B4", "Binf", "Bleq", "Bleq3", "Bleq4", "Bleqinf", "C2", "Cleq2", "LIN", "HORN", "NAE"]
    cloneFiles = clones.map((name) => "./clones/"+name+".json")
    clonesData = await loadJsonFiles(cloneFiles);

    console.log(clonesData)
    
    // Label sets (latex strings)
    const labelSets = {
	Structures: {},
	Clones: {}
    };

    for (clone in clones) {
	labelSets["Structures"][clones[clone]] = clonesData[clone]["structureLabel"]
	labelSets["Clones"][clones[clone]] = clonesData[clone]["cloneLabel"]
    }

    console.log(labelSets)

    // Label sets (latex strings)
    const legendLabelSets = {
	Structures: {
            C1: "\\mathbb C_1=(\\{0\\},\\{(0,0)\\})", 
            I2: "\\mathbb I_2=(\\{0,1\\},\\{(0,1)\\})", 
            B2: "\\mathbb B_2=(\\{0,1\\},\\{0\\},\\{0,1\\}^2\\setminus\\{(0,0)\\})", 
            B3: "\\mathbb B_3=(\\{0,1\\},\\{0\\},\\{0,1\\}^3\\setminus\\{(0,0,0)\\})", 
            B4: "\\mathbb B_4=(\\{0,1\\},\\{0\\},\\{0,1\\}^4\\setminus\\{(0,0,0,0)\\})",
            Binf: "\\mathbb B_\\infty=(\\{0,1\\},\\{0\\},\\{0,1\\}^n\\setminus\\{(0,\\dots,0)\\}\\colon n\\geq 2)", 
            Bleq: "\\text{st-Con}=(\\{0,1\\},\\{0\\},\\{1\\},\\leq)", 
            Bleq3: "\\mathbb B_{3}^{\\leq}=(\\mathbb B_3,\\leq)",
            Bleq4: "\\mathbb B_{4}^{\\leq}=(\\mathbb B_4,\\leq)", 
            Bleqinf: "\\mathbb B_{\\infty}^{\\leq}=(\\mathbb B_{\\infty},\\leq)", 
            C2: "\\mathbb C_2=(\\{0,1\\},\\neq)",
            Cleq2: "2\\mathbb S\\text{AT}=(\\{0,1\\},\\{0\\},\\neq,\\leq)", 
            LIN: "3\\mathbb L\\text{IN}_2=(\\{0,1\\},\\{0\\},x+y+z=1)", 
            HORN: "\\mathbb H\\text{ORN}=(\\{0,1\\},\\{0\\},\\{1\\},(x\\wedge y)\\Rightarrow z)",
            NAE: "1\\text{IN}3=(\\{0,1\\},\\{(0,0,1),(0,1,0),(1,0,0)\\})"
	},
	Clones: {
            O : "0(x)=0",
            m: "m(x,y,z)=x\\oplus y\\oplus z",
            q: "q(x,y,z)=x\\wedge (y\\Leftrightarrow z)",
            d3: "d_3=\\text{the unique majority on }\\{0,1\\}",
            dn: "d_n(x_1,\\dots,x_n)=\\bigvee_{i=1}^n\\bigwedge_{j\\neq i} x_j",
            //dn: "d_n(x_1,\\dots,x_n)=\\bigvee_{i=1}^n(x_1\\wedge\\dots\\wedge x_{i-1}\\wedge x_{i+1}\\wedge\\dots\\wedge x_n))",
            p: "p(x,y,z)=x\\wedge (y\\vee z)"
	}
    };
    let currentSet = 'Structures';

    // Regions: you can edit these polygons (pixel coordinates relative to the cy container)
    // Make sure coordinates are in the same coordinate system as the cy container (pixels).
    const regionDefs = [
	{ 
	    color: 'rgba(75, 192, 192, 0.2)', border: 'green',
	    nodes: ['HL1','HL2','HL3','HL4','HL5','HL6']  // region bound by these nodes
	},
	{ 
	    color: 'rgba(54, 162, 235, 0.2)', border: 'blue',
	    nodes: ['HNL1', 'HNL2','HL5','HL4','HL3']
	},
	{ 
	    color: 'rgba(153, 102, 255, 0.2)', border: 'purple',
	    nodes: ['HLin1', 'HLin2','HNL1','HL2']
	},
	{ 
	    color: 'rgba(255, 159, 64, 0.2)', border: 'orange',
	    nodes: ['HLin2', 'HNL2','HNP2','HNP3']
	},
	{ 
	    color: 'rgba(255, 99, 71, 0.2)', border: 'red',
	    nodes: ['HNP1','HNP2','HNP3']
	}
    ];
    let regionsVisible = true; // declared before functions so no TDZ









    
    // --------------------------
    // Init Cytoscape
    // --------------------------
    
    const cy = cytoscape({
	container: document.getElementById('cy'),
	elements: { nodes: nodes, edges: edges },
	layout: { name: 'preset' },
	style: [
            { selector: 'node', style: { 'background-color': '#6699cc', 'width': 35, 'height': 35 } },
            { selector: 'edge', style: { 'curve-style': 'bezier', 'width': 2, 'line-color': '#878686' } }, // undirected
            { selector: 'edge.dashed', style: { 'line-style': 'dashed' } },
            { selector: 'node.helper', style: { 
		'background-opacity': 0,
		'width': 0,
		'height': 0,
		'label': ''
	    } }
	],
	userZoomingEnabled: false,
	userPanningEnabled: false,
	boxSelectionEnabled: false,
    });

    // lock nodes so they are static
    cy.nodes().forEach(n => n.lock());





    
    // --------------------------
    // HTML labels (KaTeX-friendly)
    // --------------------------
    const cyContainer = document.getElementById('cy-container');
    const labels = {};

    nodes.forEach(n => {
	const div = document.createElement('div');
	div.className = 'label';
	div.style.zIndex = 3;
	const id = n.data.id;
	katex.render(labelSets[currentSet][id] || id, div, {
	    throwOnError: false
	});
	cyContainer.appendChild(div);
	labels[id] = div;
    });

    function updateLabelPositions() {
	cy.nodes().forEach(n => {
	    // skip helper nodes
	    const pos = n.renderedPosition();
	    const div = labels[n.id()];
	    if (!div) return;
	    if (n.hasClass('helper')) {
		div.style.display = 'none'; // make sure it's visible
		return;
	    }
	    
	    div.style.left = pos.x + 'px';
	    div.style.top = (pos.y - 0) + 'px'; // a little above the node
	    div.style.display = 'block'; // make sure it's visible
	});
    }
    
    cy.on('render', updateLabelPositions);
    
    // initial label placement
    updateLabelPositions();
    
    // --------------------------
    // SVG regions: sizing + drawing
    // --------------------------
    const regionsSVG = document.getElementById('regions');

    function syncSVGSize() {
	const rect = cy.container().getBoundingClientRect();
	const w = Math.max(1, Math.round(rect.width));
	const h = Math.max(1, Math.round(rect.height));
	regionsSVG.setAttribute('width', w);
	regionsSVG.setAttribute('height', h);
	regionsSVG.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    function pointsToSmoothPath(points, tension = 0.3) {
	if (points.length < 2) return '';
	let path = `M ${points[0][0]} ${points[0][1]}`;
	for (let i = 0; i < points.length; i++) {
	    const p0 = points[i === 0 ? points.length - 1 : i - 1];
	    const p1 = points[i];
	    const p2 = points[(i + 1) % points.length];
	    const p3 = points[(i + 2) % points.length];

	    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
	    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
	    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
	    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;

	    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
	}
	path += ' Z';
	return path;
    }
    function updateLabelLegend() {
	const container = document.getElementById('label-legend-items');
	container.innerHTML = ''; // clear previous

	const set = legendLabelSets[currentSet]; // current label set
	for (const id in set) {
	    const div = document.createElement('div');
	    div.style.display = 'flex';
	    div.style.alignItems = 'center';
	    div.style.marginBottom = '4px';

	    if (currentSet=='Structures'){
		const nodeColor = cy.getElementById(id).style('background-color'); // optional color box
		const colorBox = document.createElement('div');
		colorBox.style.width = '16px';
		colorBox.style.height = '16px';
		colorBox.style.backgroundColor = nodeColor;
		colorBox.style.border = '1px solid rgba(0,0,0,0.2)';
		colorBox.style.marginRight = '6px';
		div.appendChild(colorBox);
	    }
	    const labelSpan = document.createElement('span');
	    katex.render(set[id], labelSpan, {
		throwOnError: false
	    });

	    div.appendChild(labelSpan);
	    container.appendChild(div);
	}
    }

    // Call it initially and when switching label sets
    updateLabelLegend();

    function drawRegions() {
	syncSVGSize();
	regionsSVG.innerHTML = '';

	regionDefs.forEach(r => {
	    const inflate = 0; // how much to push vertices outward
	    const points = r.nodes.map(id => {
		const n = cy.getElementById(id);
		const pos = n.renderedPosition();
		return [pos.x, pos.y];
	    });

	    // Compute centroid
	    const centroid = [
		points.reduce((sum, p) => sum + p[0], 0) / points.length,
		points.reduce((sum, p) => sum + p[1], 0) / points.length
	    ];

	    // Inflate polygon by moving vertices away from centroid
	    const inflatedPoints = points.map(p => {
		const dx = p[0] - centroid[0];
		const dy = p[1] - centroid[1];
		const len = Math.sqrt(dx*dx + dy*dy);
		if(len === 0) return p; // avoid divide by zero
		const factor = (len + inflate) / len;
		return [centroid[0] + dx * factor, centroid[1] + dy * factor];
	    });

	    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
	    poly.setAttribute('points', inflatedPoints.map(p => p.join(',')).join(' '));
	    poly.setAttribute('fill', r.color);
	    poly.setAttribute('stroke', r.border);
	    poly.setAttribute('stroke-width', '1');
	    poly.setAttribute('vector-effect','non-scaling-stroke');
	    poly.setAttribute('stroke-linejoin','round'); // smooth corners
	    regionsSVG.appendChild(poly);
	});

	regionsSVG.style.display = regionsVisible ? 'block' : 'none';
    }



    cy.on('render', () => {
	drawRegions();
	updateLabelPositions();
    });

    // initial draw
    drawRegions();

    // keep in sync when window resized
    window.addEventListener('resize', () => {
	drawRegions();
	updateLabelPositions();
    });

    // --------------------------
    // Controls: label + region toggles + coloring
    // --------------------------
    function toggleLabels() {
	currentSet = (currentSet === 'Structures') ? 'Clones' : 'Structures';
	for (const id in labels) {
	    katex.render(labelSets[currentSet][id] || id, labels[id], {
		throwOnError: false
	    });
	}
	const btn = document.getElementById('btnToggleLabels');
	btn.textContent = currentSet === 'Structures' ? 'Switch to Clones' : 'Switch to Structures';
	// request re-typeset
	updateLabelLegend();

    }

    function toggleRegions() {
	regionsVisible = !regionsVisible;
	regionsSVG.style.display = regionsVisible ? 'block' : 'none';

	const btn = document.getElementById('btnToggleRegions');
	btn.textContent = regionsVisible ? 'Hide Complexity Classes' : 'Show Complexity Classes';

	// Show or hide the regions legend
	const regionLegend = document.getElementById('region-legend');
	if (regionLegend) {
            regionLegend.style.display = regionsVisible ? 'block' : 'none';
	}

    }

    const defaultColor = '#6699cc'; // original node color

    
    const colorsetLatex = await loadJson("./functions.json");

    functions = Object.keys(colorsetLatex);
    
    function applyColorSet(setName) {
	const greenSets = {};

	for (func in functions) {
	    greenSets[functions[func]] = new Set();
	}      
	
	for (clone in clones) {
	    console.log(clonesData[clone]["functions"])
	    for (func in clonesData[clone]["functions"]) {
		var f = clonesData[clone]["functions"][func];
		greenSets[f].add(clones[clone]);
	    }      
	}
	console.log(greenSets);
	
	cy.batch(() => {
	    cy.nodes().forEach(n => {
		if (n.hasClass('helper')) return; // skip helper nodes
		if (setName === 'none') {
		    n.style('background-color', defaultColor);
		} else {
		    n.style('background-color', greenSets[setName].has(n.id()) ? '#66bb66' : '#cc6666');  // soft green / soft red
		}
	    });
	});
	updateLabelLegend();
    }

    

    document.getElementById('colorSelect').addEventListener('change', e => {
	const setName = e.target.value;

	// Color nodes
	applyColorSet(setName);

	// Update colorset legend
	const legendDiv = document.getElementById('colorset-legend');
	const legendText = document.getElementById('colorset-legend-text');

	if (setName === 'none') {
	    legendDiv.style.display = 'none';
	    legendText.innerHTML = '';
	} else {
	    legendDiv.style.display = 'block';
	    katex.render(colorsetLatex[setName] || '', legendText, {
		throwOnError: false,
		displayMode: true
	    });
	}
    });


    // Wire the dropdown
    document.getElementById('colorSelect').addEventListener('change', e => {
	applyColorSet(e.target.value);
    });


    // Wire buttons with event listeners (safer than inline onclick)
    document.getElementById('btnToggleLabels').addEventListener('click', toggleLabels);
    document.getElementById('btnToggleRegions').addEventListener('click', toggleRegions);
    document.getElementById('btnColorSet1').addEventListener('click', colorSet1);
    document.getElementById('btnColorSet2').addEventListener('click', colorSet2);

    // final sync just in case
    //setTimeout(() => { drawRegions(); updateLabelPositions(); }, 50);
    
}

createGraph();
