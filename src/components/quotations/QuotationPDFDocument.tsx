import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// Register Noto Sans font for Vietnamese support
// Priority: local fonts > CDN
try {
  // Try local fonts first (if available)
  Font.register({
    family: 'NotoSans',
    fonts: [
      { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 'normal' },
      { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 'bold' },
    ],
  });
  console.log('Noto Sans font registered from local files');
} catch (e) {
  // Fallback to CDN
  try {
    Font.register({
      family: 'NotoSans',
      fonts: [
        {
          src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans-Regular.ttf',
          fontWeight: 'normal',
        },
        {
          src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans-Bold.ttf',
          fontWeight: 'bold',
        },
      ],
    });
    console.log('Noto Sans font registered from CDN');
  } catch (cdnError) {
    console.warn('Could not register Noto Sans font, using Helvetica (limited Vietnamese support)', cdnError);
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'NotoSans', // Noto Sans hỗ trợ đầy đủ tiếng Việt
    fontSize: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  companyName: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 25,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  text: {
    fontSize: 10,
    marginBottom: 5,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 15,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '14.28%', // 100% / 7 columns
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#428BCA',
    padding: 5,
  },
  tableCol: {
    width: '14.28%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    backgroundColor: '#fff',
  },
  tableColAlt: {
    width: '14.28%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    backgroundColor: '#F5F7FA',
  },
  headerText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cellText: {
    fontSize: 8,
    color: '#000',
  },
  cellTextCenter: {
    fontSize: 8,
    textAlign: 'center',
  },
  cellTextRight: {
    fontSize: 8,
    textAlign: 'right',
  },
  totalRow: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 20,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 10,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  noteSection: {
    marginTop: 20,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#666',
  },
});

import { Quotation } from '@/api/quotation.api';

interface QuotationPDFDocumentProps {
  quotation: Quotation;
  totalAmount: number;
  statusLabels: Record<string, string>;
}

const QuotationPDFDocument: React.FC<QuotationPDFDocumentProps> = ({
  quotation,
  totalAmount,
  statusLabels,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        {/* Header */}
        <Text style={styles.title}>BÁO GIÁ</Text>
        <Text style={styles.companyName}>CÔNG TY TNHH MISA</Text>

        {/* Quotation Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Mã báo giá: {quotation.code}</Text>
          <Text style={styles.text}>
            Ngày tạo: {format(new Date(quotation.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
          </Text>
          <Text style={styles.text}>Khách hàng: {quotation.customer_name || 'N/A'}</Text>
          {quotation.customer_phone && (
            <Text style={styles.text}>SĐT: {quotation.customer_phone}</Text>
          )}
          <Text style={styles.text}>
            Trạng thái: {statusLabels[quotation.status] || quotation.status}
          </Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.headerText}>STT</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.headerText}>Sản phẩm</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.headerText}>Mã SP</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.headerText}>Đơn giá</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.headerText}>Số lượng</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.headerText}>Thành tiền</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.headerText}>Ghi chú</Text>
            </View>
          </View>

          {/* Table Rows */}
          {(quotation.details || []).map((detail, index) => {
            const isEven = index % 2 === 0;
            const rowStyle = isEven ? styles.tableCol : styles.tableColAlt;
            
            return (
              <View style={styles.tableRow} key={index}>
                <View style={rowStyle}>
                  <Text style={styles.cellTextCenter}>{index + 1}</Text>
                </View>
                <View style={rowStyle}>
                  <Text style={styles.cellText}>{detail.product_name || detail.product?.name || 'N/A'}</Text>
                </View>
                <View style={rowStyle}>
                  <Text style={styles.cellText}>{detail.product_code || detail.product?.code || '-'}</Text>
                </View>
                <View style={rowStyle}>
                  <Text style={styles.cellTextRight}>{formatCurrency(detail.price)} đ</Text>
                </View>
                <View style={rowStyle}>
                  <Text style={styles.cellTextCenter}>{detail.quantity}</Text>
                </View>
                <View style={rowStyle}>
                  <Text style={styles.cellTextRight}>
                    {formatCurrency(detail.price * detail.quantity)} đ
                  </Text>
                </View>
                <View style={rowStyle}>
                  <Text style={styles.cellText}>{detail.note || '-'}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TỔNG TIỀN:</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalAmount)} đ</Text>
        </View>

        {/* Note */}
        {quotation.note && (
          <View style={styles.noteSection}>
            <Text>Ghi chú: {quotation.note}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Người tạo: {quotation.creator?.email || 'N/A'}</Text>
          <Text>Xuất ngày: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: vi })}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuotationPDFDocument;

