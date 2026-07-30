const {
    Resvg
} = require("@resvg/resvg-js");

const WIDTH = 1_280;
const ROOT_WIDTH = 240;
const ROOT_HEIGHT = 88;
const CARD_WIDTH = 190;
const CARD_HEIGHT = 70;
const ROOT_X = Math.round(
    (WIDTH - ROOT_WIDTH) / 2
);

class FamilyTreeImageRenderer {

    render({
        characterName,
        tree
    }) {
        const groups = new Map(
            (tree || []).map(
                group => [
                    group.key,
                    group.members
                ]
            )
        );

        const grandparents =
            groups.get("grandparents") || [];
        const parents =
            groups.get("parents") || [];
        const siblings =
            groups.get("siblings") || [];
        const partners =
            groups.get("partners") || [];
        const children =
            groups.get("children") || [];
        const grandchildren =
            groups.get("grandchildren") || [];
        const extended =
            groups.get("extended") || [];

        let nextY = 78;
        const rows = [];

        if (grandparents.length > 0) {
            rows.push({
                key: "grandparents",
                title: "GRANDS-PARENTS",
                members: grandparents,
                y: nextY
            });
            nextY += 126;
        }

        if (parents.length > 0) {
            rows.push({
                key: "parents",
                title: "PARENTS",
                members: parents,
                y: nextY
            });
            nextY += 138;
        }

        const rootY = Math.max(
            250,
            nextY
        );
        const childrenY =
            rootY + 170;
        const grandchildrenY =
            childrenY + 132;
        const extendedY =
            grandchildrenY
            + (grandchildren.length > 0 ? 130 : 0)
            + 34;

        const height = Math.max(
            620,
            extended.length > 0
                ? extendedY + 125
                : grandchildren.length > 0
                    ? grandchildrenY + 110
                    : children.length > 0
                        ? childrenY + 110
                        : rootY + 160
        );

        const positionedRows = rows.map(
            row => ({
                ...row,
                nodes: layoutCenteredRow(
                    row.members,
                    row.y
                )
            })
        );

        const rowByKey = new Map(
            positionedRows.map(
                row => [row.key, row]
            )
        );

        const root = {
            x: ROOT_X,
            y: rootY,
            width: ROOT_WIDTH,
            height: ROOT_HEIGHT
        };

        const childNodes = layoutCenteredRow(
            children,
            childrenY
        );
        const grandchildNodes = layoutCenteredRow(
            grandchildren,
            grandchildrenY
        );
        const extendedNodes = layoutCenteredRow(
            extended,
            extendedY
        );
        const siblingNodes = layoutSideColumn(
            siblings,
            rootY,
            "left"
        );
        const partnerNodes = layoutSideColumn(
            partners,
            rootY,
            "right"
        );

        const lines = [
            ...connectRows(
                rowByKey.get("grandparents"),
                rowByKey.get("parents")
            ),
            ...connectRowToNode(
                rowByKey.get("parents"),
                root
            ),
            ...connectNodeToRow(
                root,
                childNodes
            ),
            ...connectRows(
                {
                    nodes: childNodes
                },
                {
                    nodes: grandchildNodes
                }
            ),
            ...connectSideNodes(
                root,
                siblingNodes,
                "left"
            ),
            ...connectSideNodes(
                root,
                partnerNodes,
                "right"
            ),
            ...connectNodeToRow(
                root,
                extendedNodes,
                true
            )
        ];

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
                <defs>
                    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#11121b"/>
                        <stop offset="100%" stop-color="#202030"/>
                    </linearGradient>
                    <linearGradient id="root" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#5865f2"/>
                        <stop offset="100%" stop-color="#8f78ff"/>
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#090914" flood-opacity="0.55"/>
                    </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#background)"/>
                <text x="${WIDTH / 2}" y="28" fill="#f5f6fa" font-family="Arial, sans-serif" font-size="18" font-weight="700" text-anchor="middle">ARBRE GÉNÉALOGIQUE</text>
                ${lines.join("\n")}
                ${positionedRows.map(renderFamilyRow).join("\n")}
                ${renderRoot(root, characterName)}
                ${renderSideNodes(siblingNodes, "FRATRIE")}
                ${renderSideNodes(partnerNodes, "PARTENAIRE(S)")}
                ${renderCenteredNodes(childNodes, "ENFANTS")}
                ${renderCenteredNodes(grandchildNodes, "PETITS-ENFANTS")}
                ${renderCenteredNodes(extendedNodes, "FAMILLE ÉLARGIE")}
            </svg>
        `;

        return new Resvg(svg, {
            fitTo: {
                mode: "width",
                value: WIDTH
            }
        }).render().asPng();
    }

}

function layoutCenteredRow(members, y) {
    const visible = members.slice(0, 5);
    const totalWidth =
        visible.length * CARD_WIDTH
        + Math.max(0, visible.length - 1) * 18;
    const startX = Math.round(
        (WIDTH - totalWidth) / 2
    );

    return visible.map(
        (member, index) => ({
            ...member,
            x:
                startX
                + index * (CARD_WIDTH + 18),
            y,
            width: CARD_WIDTH,
            height: CARD_HEIGHT
        })
    );
}

function layoutSideColumn(members, rootY, side) {
    const visible = members.slice(0, 3);
    const x = side === "left"
        ? 34
        : WIDTH - CARD_WIDTH - 34;
    const startY = rootY
        - Math.round(
            ((visible.length - 1) * 86) / 2
        );

    return visible.map(
        (member, index) => ({
            ...member,
            x,
            y: startY + index * 86,
            width: CARD_WIDTH,
            height: CARD_HEIGHT
        })
    );
}

function connectRows(sourceRow, targetRow) {
    if (
        !sourceRow?.nodes?.length
        || !targetRow?.nodes?.length
    ) {
        return [];
    }

    return connectNodeToRow(
        virtualNode(sourceRow.nodes),
        targetRow.nodes
    );
}

function connectRowToNode(row, node) {
    if (!row?.nodes?.length) {
        return [];
    }

    return connectNodeToRow(
        virtualNode(row.nodes),
        [node]
    );
}

function connectNodeToRow(
    source,
    nodes,
    dashed = false
) {
    if (!source || nodes.length === 0) {
        return [];
    }

    const sourceX = source.x + source.width / 2;
    const sourceY = source.y + source.height;
    const targetY = nodes[0].y;
    const busY = Math.round(
        (sourceY + targetY) / 2
    );
    const targetXs = nodes.map(
        node => node.x + node.width / 2
    );
    const lineStyle = dashed
        ? " stroke-dasharray=\"7 8\""
        : "";

    return [
        `<path d="M ${sourceX} ${sourceY} V ${busY}" fill="none" stroke="#8d91b8" stroke-width="2"${lineStyle}/>`,
        `<path d="M ${Math.min(...targetXs)} ${busY} H ${Math.max(...targetXs)}" fill="none" stroke="#8d91b8" stroke-width="2"${lineStyle}/>`,
        ...nodes.map(
            node => `<path d="M ${node.x + node.width / 2} ${busY} V ${node.y}" fill="none" stroke="#8d91b8" stroke-width="2"${lineStyle}/>`
        )
    ];
}

function connectSideNodes(root, nodes, side) {
    if (nodes.length === 0) {
        return [];
    }

    const rootY = root.y + root.height / 2;
    const rootX = side === "left"
        ? root.x
        : root.x + root.width;

    return nodes.map(
        node => {
            const nodeX = side === "left"
                ? node.x + node.width
                : node.x;
            const nodeY = node.y + node.height / 2;

            return `<path d="M ${rootX} ${rootY} H ${nodeX}" fill="none" stroke="#8d91b8" stroke-width="2"/>`
                + (nodeY === rootY
                    ? ""
                    : `<path d="M ${nodeX} ${rootY} V ${nodeY}" fill="none" stroke="#8d91b8" stroke-width="2"/>`);
        });
}

function virtualNode(nodes) {
    const left = Math.min(
        ...nodes.map(node => node.x)
    );
    const right = Math.max(
        ...nodes.map(
            node => node.x + node.width
        )
    );
    const y = Math.max(
        ...nodes.map(node => node.y)
    );

    return {
        x: left,
        y,
        width: right - left,
        height: CARD_HEIGHT
    };
}

function renderFamilyRow(row) {
    return [
        `<text x="${WIDTH / 2}" y="${row.y - 12}" fill="#b8bad2" font-family="Arial, sans-serif" font-size="13" font-weight="700" text-anchor="middle">${row.title}</text>`,
        ...row.nodes.map(renderNode)
    ].join("\n");
}

function renderCenteredNodes(nodes, title) {
    if (nodes.length === 0) {
        return "";
    }

    const y = nodes[0].y - 12;

    return [
        `<text x="${WIDTH / 2}" y="${y}" fill="#b8bad2" font-family="Arial, sans-serif" font-size="13" font-weight="700" text-anchor="middle">${title}</text>`,
        ...nodes.map(renderNode)
    ].join("\n");
}

function renderSideNodes(nodes, title) {
    if (nodes.length === 0) {
        return "";
    }

    const isLeft = nodes[0].x < WIDTH / 2;
    const x = isLeft
        ? nodes[0].x
        : nodes[0].x + CARD_WIDTH;
    const anchor = isLeft
        ? "start"
        : "end";
    const y = Math.min(
        ...nodes.map(node => node.y)
    ) - 12;

    return [
        `<text x="${x}" y="${y}" fill="#b8bad2" font-family="Arial, sans-serif" font-size="12" font-weight="700" text-anchor="${anchor}">${title}</text>`,
        ...nodes.map(renderNode)
    ].join("\n");
}

function renderRoot(root, characterName) {
    return `
        <g filter="url(#shadow)">
            <rect x="${root.x}" y="${root.y}" width="${root.width}" height="${root.height}" rx="18" fill="url(#root)" stroke="#c5c9ff" stroke-width="2"/>
            <text x="${root.x + root.width / 2}" y="${root.y + 34}" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="700" text-anchor="middle">PERSONNAGE</text>
            <text x="${root.x + root.width / 2}" y="${root.y + 64}" fill="#ffffff" font-family="Arial, sans-serif" font-size="23" font-weight="700" text-anchor="middle">${escapeXml(truncate(characterName, 24))}</text>
        </g>
    `;
}

function renderNode(node) {
    return `
        <g filter="url(#shadow)">
            <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="13" fill="#2b2d3c" stroke="#555a78" stroke-width="1"/>
            <text x="${node.x + node.width / 2}" y="${node.y + 29}" fill="#f3f4f8" font-family="Arial, sans-serif" font-size="17" font-weight="700" text-anchor="middle">${escapeXml(truncate(node.name, 20))}</text>
            <text x="${node.x + node.width / 2}" y="${node.y + 51}" fill="#b8bad2" font-family="Arial, sans-serif" font-size="12" text-anchor="middle">${escapeXml(truncate(node.label, 27))}</text>
        </g>
    `;
}

function escapeXml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function truncate(value, maximum) {
    const text = String(value || "").trim()
        || "Inconnu";

    return text.length > maximum
        ? `${text.slice(0, maximum - 1)}…`
        : text;
}

const renderer =
    new FamilyTreeImageRenderer();

module.exports = renderer;
module.exports.FamilyTreeImageRenderer =
    FamilyTreeImageRenderer;
