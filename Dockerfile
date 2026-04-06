FROM node:20-alpine

RUN npm install -g decisionnode

CMD ["decide-mcp"]
