// app/api/exportar-pedidos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

type ItemCarrinho = {
  kind: "UNIFORME" | "CANECA"
  productId: string
  label: string
  unitPrice: number
  quantity: number
  tipoPedido?: "KIT" | "BLUSA"
  modelo?: "BRANCA" | "AZUL" | "AZUL_SEM_MANGA"
  tamanho?: string
  nomeCamisa?: string
  numeroCamisa?: string
  tipoProduto?: "CANECA" | "TIRANTE" | "KIT"
}

type PedidoCarrinho = {
  id: string
  txid: string
  nome: string
  email: string
  telefone: string
  status: string
  createdAt: string
  itemsJson: ItemCarrinho[]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pedidos } = body as { pedidos: PedidoCarrinho[] }

    if (!pedidos || !Array.isArray(pedidos)) {
      return NextResponse.json(
        { error: 'Pedidos inválidos' },
        { status: 400 }
      )
    }

    // Criar workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Pedidos')

    // Definir colunas
    worksheet.columns = [
      { header: 'Data', key: 'data', width: 18 },
      { header: 'TXID', key: 'txid', width: 25 },
      { header: 'Nome', key: 'nome', width: 25 },
      { header: 'Telefone', key: 'telefone', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Produto', key: 'produto', width: 25 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Quantidade', key: 'quantidade', width: 12 },
      { header: 'Modelo', key: 'modelo', width: 18 },
      { header: 'Tamanho', key: 'tamanho', width: 10 },
      { header: 'Nome Camisa', key: 'nomeCamisa', width: 20 },
      { header: 'Número Camisa', key: 'numeroCamisa', width: 15 },
    ]

    // Estilizar cabeçalho
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 20

    // Adicionar dados
    for (const pedido of pedidos) {
      const dataFormatada = new Date(pedido.createdAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      const items = Array.isArray(pedido.itemsJson) ? pedido.itemsJson : []

      if (items.length === 0) {
        worksheet.addRow({
          data: dataFormatada,
          txid: pedido.txid,
          nome: pedido.nome,
          telefone: pedido.telefone,
          email: pedido.email,
          status: pedido.status,
          produto: '-',
          tipo: '-',
          quantidade: 0,
          modelo: '-',
          tamanho: '-',
          nomeCamisa: '-',
          numeroCamisa: '-',
        })
      } else {
        for (const item of items) {
          const row = worksheet.addRow({
            data: dataFormatada,
            txid: pedido.txid,
            nome: pedido.nome,
            telefone: pedido.telefone,
            email: pedido.email,
            status: pedido.status,
            produto: item.label || 'Produto',
            tipo: item.kind || '-',
            quantidade: item.quantity || 1,
            modelo: item.kind === 'UNIFORME' ? (item.modelo || '-') : '-',
            tamanho: item.kind === 'UNIFORME' ? (item.tamanho || '-') : '-',
            nomeCamisa: item.kind === 'UNIFORME' ? (item.nomeCamisa || '-') : '-',
            numeroCamisa: item.kind === 'UNIFORME' ? (item.numeroCamisa || '-') : '-',
          })

          // Aplicar estilo baseado no status
          const statusCell = row.getCell('status')
          switch (pedido.status) {
            case 'PAGO':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD1FAE5' }
              }
              statusCell.font = { color: { argb: 'FF065F46' }, bold: true, name: 'Arial', size: 10 }
              break
            case 'AGUARDANDO_PAGAMENTO':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEF3C7' }
              }
              statusCell.font = { color: { argb: 'FF92400E' }, bold: true, name: 'Arial', size: 10 }
              break
            case 'PAGO_METADE':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE9D5FF' }
              }
              statusCell.font = { color: { argb: 'FF6B21A8' }, bold: true, name: 'Arial', size: 10 }
              break
            case 'CANCELADO':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEE2E2' }
              }
              statusCell.font = { color: { argb: 'FF991B1B' }, bold: true, name: 'Arial', size: 10 }
              break
          }
        }
      }
    }

    // Estilizar todas as células do corpo
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.font = { name: 'Arial', size: 10 }
        row.alignment = { vertical: 'middle' }
      }
    })

    // Congelar primeira linha
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ]

    // Gerar buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Retornar arquivo
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pedidos-energizada-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Erro ao exportar:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar planilha' },
      { status: 500 }
    )
  }
}