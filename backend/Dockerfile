# Usa uma imagem oficial do Go
FROM golang:1.25-alpine

WORKDIR /app

# Copia os ficheiros de dependências
COPY go.mod go.sum ./
RUN go mod download

# Copia o resto do código
COPY . .

# Compila a aplicação a partir da pasta cmd
RUN go build -o main ./cmd/main.go

# Expõe a porta (ajusta se a tua API usar outra)
EXPOSE 8080

CMD ["./main"]