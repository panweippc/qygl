/*
 Navicat Premium Dump SQL

 Source Server         : localhost_3306
 Source Server Type    : MySQL
 Source Server Version : 80045 (8.0.45)
 Source Host           : localhost:3306
 Source Schema         : qyglfb

 Target Server Type    : MySQL
 Target Server Version : 80045 (8.0.45)
 File Encoding         : 65001

 Date: 22/07/2026 09:34:03
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for approval_history
-- ----------------------------
DROP TABLE IF EXISTS `approval_history`;
CREATE TABLE `approval_history`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_id` int NOT NULL,
  `step` int NOT NULL,
  `node_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `approver_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approver_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `approver_role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `action` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_business`(`business_type` ASC, `business_id` ASC) USING BTREE,
  INDEX `idx_approver`(`approver_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of approval_history
-- ----------------------------

-- ----------------------------
-- Table structure for branch_contexts
-- ----------------------------
DROP TABLE IF EXISTS `branch_contexts`;
CREATE TABLE `branch_contexts`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `instance_id` int NOT NULL,
  `branch_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gateway_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'active',
  `start_time` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` datetime NULL DEFAULT NULL,
  `variables` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_instance`(`instance_id` ASC) USING BTREE,
  INDEX `idx_gateway`(`gateway_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of branch_contexts
-- ----------------------------

-- ----------------------------
-- Table structure for business_trip_applications
-- ----------------------------
DROP TABLE IF EXISTS `business_trip_applications`;
CREATE TABLE `business_trip_applications`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `trip_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicant_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicant_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `destination` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `trip_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `days` int NOT NULL,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `itinerary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `estimated_cost` decimal(12, 2) NOT NULL,
  `cost_breakdown` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `accommodation` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `transport` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `accompany_persons` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `customer_info` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'pending',
  `approver` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `current_step` int NULL DEFAULT 1,
  `current_approvers` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `approval_history` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `is_urgent` tinyint NULL DEFAULT 0,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `trip_code`(`trip_code` ASC) USING BTREE,
  INDEX `idx_applicant`(`applicant_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_dates`(`start_date` ASC, `end_date` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of business_trip_applications
-- ----------------------------

-- ----------------------------
-- Table structure for chats
-- ----------------------------
DROP TABLE IF EXISTS `chats`;
CREATE TABLE `chats`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastMessage` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `time` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `createdAt` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_createdAt`(`createdAt` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of chats
-- ----------------------------
INSERT INTO `chats` VALUES (1, '公共聊天', '欢迎大家加入公共聊天！', '16:57', '2026-04-13 16:57:24', '2026-04-13 16:57:24');

-- ----------------------------
-- Table structure for cities
-- ----------------------------
DROP TABLE IF EXISTS `cities`;
CREATE TABLE `cities`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provinceId` int NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `city_unique`(`provinceId` ASC, `name` ASC) USING BTREE,
  CONSTRAINT `cities_ibfk_1` FOREIGN KEY (`provinceId`) REFERENCES `provinces` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 49 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of cities
-- ----------------------------
INSERT INTO `cities` VALUES (1, '呼和浩特市', '150100', 1, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (2, '包头市', '150200', 1, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (3, '赤峰市', '150400', 1, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (4, '通辽市', '150500', 1, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (5, '鄂尔多斯市', '150600', 1, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (6, '朝阳区', '110105', 2, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (7, '海淀区', '110108', 2, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (8, '丰台区', '110106', 2, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (9, '大兴区', '110115', 2, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (10, '浦东新区', '310115', 3, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (11, '黄浦区', '310101', 3, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (12, '徐汇区', '310104', 3, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (13, '静安区', '310106', 3, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (14, '长宁区', '310105', 3, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (15, '广州市', '440100', 4, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (16, '深圳市', '440300', 4, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (17, '珠海市', '440400', 4, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (18, '佛山市', '440600', 4, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (19, '东莞市', '441900', 4, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (20, '南京市', '320100', 5, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (21, '苏州市', '320500', 5, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (22, '无锡市', '320200', 5, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (23, '常州市', '320400', 5, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (24, '南通市', '320600', 5, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (25, '杭州市', '330100', 6, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (26, '宁波市', '330200', 6, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (27, '温州市', '330300', 6, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (28, '嘉兴市', '330400', 6, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (29, '绍兴市', '330600', 6, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (30, '济南市', '370100', 7, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (31, '青岛市', '370200', 7, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (32, '烟台市', '370600', 7, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (33, '潍坊市', '370700', 7, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (34, '临沂市', '371300', 7, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (35, '郑州市', '410100', 8, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (36, '洛阳市', '410300', 8, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (37, '新乡市', '410700', 8, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (38, '南阳市', '411300', 8, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (39, '许昌市', '411000', 8, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (40, '成都市', '510100', 9, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (41, '绵阳市', '510700', 9, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (42, '德阳市', '510600', 9, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (43, '南充市', '511300', 9, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (44, '宜宾市', '511500', 9, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (45, '武汉市', '420100', 10, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (46, '宜昌市', '420500', 10, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (47, '襄阳市', '420600', 10, '2026-04-13 08:57:00');
INSERT INTO `cities` VALUES (48, '荆州市', '421000', 10, '2026-04-13 08:57:00');

-- ----------------------------
-- Table structure for city_sales
-- ----------------------------
DROP TABLE IF EXISTS `city_sales`;
CREATE TABLE `city_sales`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sales` decimal(10, 2) NOT NULL,
  `customers` int NOT NULL,
  `growthRate` decimal(5, 2) NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 140 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of city_sales
-- ----------------------------
INSERT INTO `city_sales` VALUES (13, '天津市', 0.00, 0, 0.00, '2026-07-17 02:29:06');
INSERT INTO `city_sales` VALUES (14, '乌兰察布市', 0.00, 0, 0.00, '2026-07-17 03:04:10');
INSERT INTO `city_sales` VALUES (15, '呼和浩特市', 0.00, 0, 0.00, '2026-07-17 06:39:02');
INSERT INTO `city_sales` VALUES (16, '包头市', 0.00, 0, 0.00, '2026-07-17 08:16:33');
INSERT INTO `city_sales` VALUES (124, '凉城县', 0.00, 73, 0.00, '2026-07-20 09:50:30');
INSERT INTO `city_sales` VALUES (125, '卓资县', 0.00, 52, 0.00, '2026-07-20 09:50:35');
INSERT INTO `city_sales` VALUES (126, '兴和县', 0.00, 25, 0.00, '2026-07-20 09:50:36');
INSERT INTO `city_sales` VALUES (127, '商都县', 0.00, 57, 0.00, '2026-07-20 09:50:38');
INSERT INTO `city_sales` VALUES (128, '化德县', 0.00, 43, 0.00, '2026-07-20 09:50:38');
INSERT INTO `city_sales` VALUES (129, '察哈尔右翼前旗', 0.00, 22, 0.00, '2026-07-20 09:50:40');
INSERT INTO `city_sales` VALUES (130, '察哈尔右翼中旗', 0.00, 81, 0.00, '2026-07-20 09:50:40');
INSERT INTO `city_sales` VALUES (131, '察哈尔右翼后旗', 0.00, 25, 0.00, '2026-07-20 09:50:43');
INSERT INTO `city_sales` VALUES (132, '丰镇市隆盛庄镇', 0.00, 1, 0.00, '2026-07-20 09:50:45');
INSERT INTO `city_sales` VALUES (133, '丰镇市红砂坝镇', 0.00, 9, 0.00, '2026-07-20 09:50:45');
INSERT INTO `city_sales` VALUES (134, '‌丰镇市巨宝庄镇', 0.00, 13, 0.00, '2026-07-20 09:50:46');
INSERT INTO `city_sales` VALUES (135, '‌丰镇市黑土台镇', 0.00, 10, 0.00, '2026-07-20 09:50:46');
INSERT INTO `city_sales` VALUES (136, '土默特左旗', 0.00, 105, 0.00, '2026-07-20 09:50:46');
INSERT INTO `city_sales` VALUES (137, '武川县', 0.00, 42, 0.00, '2026-07-20 09:50:47');
INSERT INTO `city_sales` VALUES (138, '四子王旗', 0.00, 36, 0.00, '2026-07-20 09:50:48');
INSERT INTO `city_sales` VALUES (139, '鄂尔多斯市', 0.00, 0, 0.00, '2026-07-20 09:51:34');

-- ----------------------------
-- Table structure for closing_projects
-- ----------------------------
DROP TABLE IF EXISTS `closing_projects`;
CREATE TABLE `closing_projects`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `startDate` date NOT NULL,
  `dealTime` date NOT NULL,
  `price` decimal(18, 2) NOT NULL,
  `serviceEndTime` date NOT NULL,
  `nextYearFeeStatus` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provinceId` int NULL DEFAULT NULL,
  `cityId` int NULL DEFAULT NULL,
  `countyId` int NULL DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `contractFeeStatus` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '未结',
  `remainingAmount` decimal(18, 2) NULL DEFAULT 0.00,
  `applicant` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `provinceId`(`provinceId` ASC) USING BTREE,
  INDEX `cityId`(`cityId` ASC) USING BTREE,
  INDEX `countyId`(`countyId` ASC) USING BTREE,
  CONSTRAINT `closing_projects_ibfk_1` FOREIGN KEY (`provinceId`) REFERENCES `provinces` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `closing_projects_ibfk_2` FOREIGN KEY (`cityId`) REFERENCES `cities` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `closing_projects_ibfk_3` FOREIGN KEY (`countyId`) REFERENCES `counties` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of closing_projects
-- ----------------------------

-- ----------------------------
-- Table structure for counties
-- ----------------------------
DROP TABLE IF EXISTS `counties`;
CREATE TABLE `counties`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cityId` int NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `county_unique`(`cityId` ASC, `name` ASC) USING BTREE,
  CONSTRAINT `counties_ibfk_1` FOREIGN KEY (`cityId`) REFERENCES `cities` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 63 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of counties
-- ----------------------------
INSERT INTO `counties` VALUES (1, '新城区', '150102', 1, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (2, '回民区', '150103', 1, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (3, '玉泉区', '150104', 1, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (4, '赛罕区', '150105', 1, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (5, '昆都仑区', '150203', 2, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (6, '东河区', '150202', 2, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (7, '青山区', '150204', 2, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (8, '红山区', '150402', 3, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (9, '元宝山区', '150403', 3, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (10, '松山区', '150404', 3, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (11, '宁城县', '150429', 3, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (12, '天河区', '440106', 15, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (13, '越秀区', '440104', 15, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (14, '海珠区', '440105', 15, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (15, '白云区', '440111', 15, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (16, '番禺区', '440113', 15, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (17, '福田区', '440304', 16, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (18, '罗湖区', '440303', 16, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (19, '南山区', '440305', 16, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (20, '宝安区', '440306', 16, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (21, '龙岗区', '440307', 16, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (22, '玄武区', '320102', 20, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (23, '秦淮区', '320104', 20, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (24, '建邺区', '320105', 20, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (25, '鼓楼区', '320106', 20, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (26, '浦口区', '320111', 20, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (27, '姑苏区', '320508', 21, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (28, '虎丘区', '320505', 21, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (29, '吴中区', '320506', 21, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (30, '相城区', '320507', 21, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (31, '吴江区', '320509', 21, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (32, '上城区', '330102', 25, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (33, '下城区', '330103', 25, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (34, '江干区', '330104', 25, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (35, '拱墅区', '330105', 25, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (36, '西湖区', '330106', 25, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (37, '海曙区', '330203', 26, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (38, '江北区', '330205', 26, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (39, '北仑区', '330206', 26, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (40, '镇海区', '330211', 26, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (41, '历下区', '370102', 30, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (42, '市中区', '370103', 30, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (43, '槐荫区', '370104', 30, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (44, '天桥区', '370105', 30, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (45, '市南区', '370202', 31, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (46, '市北区', '370203', 31, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (47, '黄岛区', '370211', 31, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (48, '崂山区', '370212', 31, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (49, '中原区', '410102', 35, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (50, '二七区', '410103', 35, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (51, '管城回族区', '410104', 35, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (52, '金水区', '410105', 35, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (53, '锦江区', '510104', 40, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (54, '青羊区', '510105', 40, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (55, '金牛区', '510106', 40, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (56, '武侯区', '510107', 40, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (57, '成华区', '510108', 40, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (58, '江岸区', '420102', 45, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (59, '江汉区', '420103', 45, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (60, '硚口区', '420104', 45, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (61, '汉阳区', '420105', 45, '2026-04-13 08:57:03');
INSERT INTO `counties` VALUES (62, '��������', '999999', 1, '2026-07-21 09:57:00');

-- ----------------------------
-- Table structure for county_sales
-- ----------------------------
DROP TABLE IF EXISTS `county_sales`;
CREATE TABLE `county_sales`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `cityId` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sales` decimal(10, 2) NOT NULL,
  `customers` int NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `cityId`(`cityId` ASC) USING BTREE,
  CONSTRAINT `county_sales_ibfk_1` FOREIGN KEY (`cityId`) REFERENCES `city_sales` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 168 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of county_sales
-- ----------------------------
INSERT INTO `county_sales` VALUES (152, 124, '凉城县', 0.00, 73, '2026-07-20 09:50:31');
INSERT INTO `county_sales` VALUES (153, 125, '卓资县', 0.00, 52, '2026-07-20 09:50:35');
INSERT INTO `county_sales` VALUES (154, 126, '兴和县', 0.00, 25, '2026-07-20 09:50:37');
INSERT INTO `county_sales` VALUES (155, 127, '商都县', 0.00, 57, '2026-07-20 09:50:38');
INSERT INTO `county_sales` VALUES (156, 128, '化德县', 0.00, 43, '2026-07-20 09:50:38');
INSERT INTO `county_sales` VALUES (157, 129, '察哈尔右翼前旗', 0.00, 22, '2026-07-20 09:50:40');
INSERT INTO `county_sales` VALUES (158, 130, '察哈尔右翼中旗', 0.00, 81, '2026-07-20 09:50:40');
INSERT INTO `county_sales` VALUES (159, 131, '察哈尔右翼后旗', 0.00, 25, '2026-07-20 09:50:43');
INSERT INTO `county_sales` VALUES (160, 132, '丰镇市隆盛庄镇', 0.00, 1, '2026-07-20 09:50:45');
INSERT INTO `county_sales` VALUES (161, 133, '丰镇市红砂坝镇', 0.00, 9, '2026-07-20 09:50:46');
INSERT INTO `county_sales` VALUES (162, 134, '‌丰镇市巨宝庄镇', 0.00, 13, '2026-07-20 09:50:46');
INSERT INTO `county_sales` VALUES (163, 135, '‌丰镇市黑土台镇', 0.00, 10, '2026-07-20 09:50:46');
INSERT INTO `county_sales` VALUES (164, 136, '土默特左旗', 0.00, 105, '2026-07-20 09:50:46');
INSERT INTO `county_sales` VALUES (165, 137, '武川县', 0.00, 42, '2026-07-20 09:50:47');
INSERT INTO `county_sales` VALUES (166, 138, '四子王旗', 0.00, 36, '2026-07-20 09:50:48');
INSERT INTO `county_sales` VALUES (167, 14, '凉城县', 100000.00, 5, '2026-07-20 09:51:48');

-- ----------------------------
-- Table structure for customer_activities
-- ----------------------------
DROP TABLE IF EXISTS `customer_activities`;
CREATE TABLE `customer_activities`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `customerId` int NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `followUpMethod` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `followUpTime` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `customerId`(`customerId` ASC) USING BTREE,
  CONSTRAINT `customer_activities_ibfk_1` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of customer_activities
-- ----------------------------

-- ----------------------------
-- Table structure for customers
-- ----------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tags` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 31 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of customers
-- ----------------------------

-- ----------------------------
-- Table structure for departments
-- ----------------------------
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '启用',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `name`(`name` ASC) USING BTREE,
  UNIQUE INDEX `code`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of departments
-- ----------------------------
INSERT INTO `departments` VALUES (1, '技术部', 'tech', '负责公司技术开发和系统维护', '启用', '2026-05-20 02:42:05', '2026-05-20 02:42:05');
INSERT INTO `departments` VALUES (2, '销售部', 'sales', '负责公司产品销售和客户关系管理', '启用', '2026-05-20 02:42:05', '2026-05-20 02:42:05');
INSERT INTO `departments` VALUES (3, '财务部', 'finance', '负责公司财务管理和会计核算', '启用', '2026-05-20 02:42:05', '2026-05-20 02:42:05');
INSERT INTO `departments` VALUES (4, '人力资源部', 'hr', '负责人力资源管理和员工培训', '启用', '2026-05-20 02:42:05', '2026-05-20 02:42:05');
INSERT INTO `departments` VALUES (5, '管理部门', 'management', '公司管理层', '启用', '2026-05-20 02:42:05', '2026-05-20 02:42:05');

-- ----------------------------
-- Table structure for distributed_records
-- ----------------------------
DROP TABLE IF EXISTS `distributed_records`;
CREATE TABLE `distributed_records`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicationId` int NOT NULL COMMENT '原申请ID',
  `applicationType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '申请类型(leave/reimbursement/meeting)',
  `applicant` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原申请人',
  `distributedBy` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '下发人',
  `targetUser` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '下发目标用户',
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '下发说明',
  `processComment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '处理说明',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '待处理' COMMENT '状态(待处理/已处理)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_targetUser`(`targetUser` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_applicationId`(`applicationId` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of distributed_records
-- ----------------------------
INSERT INTO `distributed_records` VALUES (1, 5, 'leave', '潘伟', '李智鑫', '潘伟', '同意申请', NULL, '已处理', '2026-07-17 02:03:24', '2026-07-17 02:04:21');

-- ----------------------------
-- Table structure for employee_roles
-- ----------------------------
DROP TABLE IF EXISTS `employee_roles`;
CREATE TABLE `employee_roles`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `unique_emp_role`(`employee_id` ASC, `role` ASC, `department` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of employee_roles
-- ----------------------------

-- ----------------------------
-- Table structure for employees
-- ----------------------------
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entryDate` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '在职',
  `employeeType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '正式员工',
  `education` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `birthDate` date NULL DEFAULT NULL,
  `idCard` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `address` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `emergencyContact` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `emergencyPhone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `parentDepartmentId` int NULL DEFAULT NULL,
  `level` int NULL DEFAULT 1,
  `roleId` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `unique_name`(`name` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 92 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of employees
-- ----------------------------
INSERT INTO `employees` VALUES (5, '潘伟', '技术部', '系统运维工程师', 'panwei@test.com', '13800138005', '2026-07-13 09:43:55', '2026-04-13 08:57:23', '在职', '正式员工', '', NULL, '', '', '', '', NULL, 1, 1);
INSERT INTO `employees` VALUES (6, '陈东', '销售部', '销售部经理', 'chendong@example.com', '13800138006', '2026-04-12 08:57:23', '2026-04-13 08:57:23', '在职', '正式员工', '', NULL, '', '', '', '', NULL, 1, 5);
INSERT INTO `employees` VALUES (7, '李志娟', '技术部', '系统运维工程师', '@example.com', '12313131314', '2026-07-14 01:44:04', '2026-06-16 15:04:26', '在职', '正式员工', '', NULL, '', '', '', '', NULL, 1, 2);
INSERT INTO `employees` VALUES (8, '娜慕罕', '技术部', '系统运维工程师', '12@example.com', '12313131332', '2026-07-12 23:24:46', '2026-06-16 15:04:26', '在职', '正式员工', '', NULL, '', '', '', '', NULL, 1, 2);
INSERT INTO `employees` VALUES (89, '张海琼', '财务部', '财务总监', '', '', '2026-07-12 23:15:20', '2026-07-13 07:15:20', '在职', '正式员工', '', NULL, '', '', '', '', NULL, 1, 3);
INSERT INTO `employees` VALUES (90, '邢誉露', '技术部', '系统运维工程师', '', '', '2026-07-12 23:21:17', '2026-07-13 07:21:17', '试用期', '实习生', '', NULL, '', '', '', '', NULL, 1, 2);
INSERT INTO `employees` VALUES (91, '李智鑫', '管理部门', '总经理', '', '', '2026-07-13 00:17:14', '2026-07-13 07:23:46', '在职', '正式员工', '', NULL, '', '', '', '', NULL, 1, 6);

-- ----------------------------
-- Table structure for entertainment_expenses
-- ----------------------------
DROP TABLE IF EXISTS `entertainment_expenses`;
CREATE TABLE `entertainment_expenses`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicant` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `guestName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `guestCount` int NOT NULL DEFAULT 1,
  `expenseType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expenseAmount` decimal(10, 2) NOT NULL,
  `expenseDate` date NOT NULL,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '审批中',
  `approver` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `result` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of entertainment_expenses
-- ----------------------------

-- ----------------------------
-- Table structure for file_categories
-- ----------------------------
DROP TABLE IF EXISTS `file_categories`;
CREATE TABLE `file_categories`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of file_categories
-- ----------------------------
INSERT INTO `file_categories` VALUES (1, '综合平台', '综合类平台文件', '2026-04-13 08:57:17');
INSERT INTO `file_categories` VALUES (2, '三位一体', '三位一体相关文件', '2026-04-13 08:57:17');
INSERT INTO `file_categories` VALUES (3, '智慧农业', '智慧农业相关文件', '2026-04-13 08:57:17');
INSERT INTO `file_categories` VALUES (4, '乡村振兴', '乡村振兴相关文件', '2026-04-13 08:57:17');
INSERT INTO `file_categories` VALUES (5, '其他', '其他类型文件', '2026-04-13 08:57:17');

-- ----------------------------
-- Table structure for files
-- ----------------------------
DROP TABLE IF EXISTS `files`;
CREATE TABLE `files`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` int NOT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaderId` int NOT NULL,
  `categoryId` int NULL DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `uploaderId`(`uploaderId` ASC) USING BTREE,
  INDEX `categoryId`(`categoryId` ASC) USING BTREE,
  CONSTRAINT `files_ibfk_1` FOREIGN KEY (`uploaderId`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `files_ibfk_2` FOREIGN KEY (`categoryId`) REFERENCES `file_categories` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of files
-- ----------------------------
INSERT INTO `files` VALUES (1, '综合平台方案.pdf', 1024000, 'application/pdf', 'https://example.com/files/1.pdf', 1, 1, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (2, '三位一体实施计划.docx', 512000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'https://example.com/files/2.docx', 1, 2, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (3, '智慧农业技术手册.pdf', 1536000, 'application/pdf', 'https://example.com/files/3.pdf', 1, 3, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (4, '乡村振兴规划.pptx', 2048000, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'https://example.com/files/4.pptx', 1, 4, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (5, '项目总结报告.pdf', 819200, 'application/pdf', 'https://example.com/files/5.pdf', 1, 5, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (6, '综合平台技术文档.docx', 614400, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'https://example.com/files/6.docx', 1, 1, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (7, '三位一体项目方案.pdf', 1228800, 'application/pdf', 'https://example.com/files/7.pdf', 1, 2, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (8, '智慧农业设备清单.xlsx', 409600, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'https://example.com/files/8.xlsx', 1, 3, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (9, '乡村振兴资金申请报告.docx', 716800, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'https://example.com/files/9.docx', 1, 4, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (10, '会议记录.txt', 102400, 'text/plain', 'https://example.com/files/10.txt', 1, 5, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (11, '综合平台测试报告.pdf', 921600, 'application/pdf', 'https://example.com/files/11.pdf', 1, 1, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (12, '三位一体培训材料.pptx', 1843200, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'https://example.com/files/12.pptx', 1, 2, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (13, '智慧农业数据统计.xlsx', 512000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'https://example.com/files/13.xlsx', 1, 3, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (14, '乡村振兴案例分析.pdf', 1126400, 'application/pdf', 'https://example.com/files/14.pdf', 1, 4, '2026-04-13 08:57:17');
INSERT INTO `files` VALUES (15, '技术方案讨论稿.docx', 614400, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'https://example.com/files/15.docx', 1, 5, '2026-04-13 08:57:17');

-- ----------------------------
-- Table structure for knowledge_articles
-- ----------------------------
DROP TABLE IF EXISTS `knowledge_articles`;
CREATE TABLE `knowledge_articles`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `categoryId` int NULL DEFAULT NULL,
  `title` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `files` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `author` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `tags` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `sort` int NULL DEFAULT 0,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'published',
  `views` int NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `categoryId`(`categoryId` ASC) USING BTREE,
  CONSTRAINT `knowledge_articles_ibfk_1` FOREIGN KEY (`categoryId`) REFERENCES `knowledge_categories` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of knowledge_articles
-- ----------------------------
INSERT INTO `knowledge_articles` VALUES (16, 1, '测试', '', '[{\"name\":\"工作报告6.5-6.9.docx\",\"url\":\"/uploads/1784615664156-814158456.docx\",\"type\":\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\",\"size\":15860}]', '', '潘伟', '人事', 0, 'published', 3, '2026-07-21 06:34:24', '2026-07-21 06:34:24');

-- ----------------------------
-- Table structure for knowledge_categories
-- ----------------------------
DROP TABLE IF EXISTS `knowledge_categories`;
CREATE TABLE `knowledge_categories`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `sort` int NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of knowledge_categories
-- ----------------------------
INSERT INTO `knowledge_categories` VALUES (1, '公司制度', '公司各项规章制度', 1, '2026-07-21 01:36:44', '2026-07-21 01:36:44');
INSERT INTO `knowledge_categories` VALUES (2, '技术文档', '技术方案和开发文档', 2, '2026-07-21 01:36:44', '2026-07-21 01:36:44');
INSERT INTO `knowledge_categories` VALUES (3, '销售资料', '销售相关资料和案例', 3, '2026-07-21 01:36:44', '2026-07-21 01:36:44');
INSERT INTO `knowledge_categories` VALUES (4, '操作手册', '系统操作指南', 4, '2026-07-21 01:36:44', '2026-07-21 01:36:44');

-- ----------------------------
-- Table structure for leave_applications
-- ----------------------------
DROP TABLE IF EXISTS `leave_applications`;
CREATE TABLE `leave_applications`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicant` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `leaveType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `days` int NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '审批中',
  `approver` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nextApprover` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `result` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of leave_applications
-- ----------------------------
INSERT INTO `leave_applications` VALUES (3, '潘伟', '事假', '2026-07-17', '2026-07-22', 6, 'ceshi11', '已批准', '李智鑫', NULL, 'tongyi1\n---\n李智鑫: cefwq', '陈东:批准;李智鑫:批准', '2026-07-17 01:25:06');
INSERT INTO `leave_applications` VALUES (4, '潘伟', '病假', '2026-07-17', '2026-07-22', 6, 'ceshi111', '已批准', '李智鑫', NULL, 'tongyi\n---\n李智鑫: cada1', '陈东:批准;李智鑫:批准', '2026-07-17 01:35:31');
INSERT INTO `leave_applications` VALUES (5, '潘伟', '年假', '2026-07-16', '2026-07-22', 7, 'ceaddaj', '已批准', '李智鑫', NULL, '陈东: 暂时同意\n---\n李智鑫: 同意', '陈东:批准;李智鑫:批准', '2026-07-17 02:00:43');

-- ----------------------------
-- Table structure for meetings
-- ----------------------------
DROP TABLE IF EXISTS `meetings`;
CREATE TABLE `meetings`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organizer` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `meetingDate` date NOT NULL,
  `meetingTime` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `participants` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `agenda` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '待审批',
  `approver` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `result` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of meetings
-- ----------------------------

-- ----------------------------
-- Table structure for menus
-- ----------------------------
DROP TABLE IF EXISTS `menus`;
CREATE TABLE `menus`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `parentId` int NULL DEFAULT 0,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `component` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `icon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `sort` int NULL DEFAULT 0,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '启用',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of menus
-- ----------------------------
INSERT INTO `menus` VALUES (1, 0, '系统管理', '/system', 'SystemManagementView', '⚙️', 1, '启用', '2026-04-14 07:36:54', '2026-04-14 07:36:54');
INSERT INTO `menus` VALUES (5, 0, '工具入库', '/tool-inventory', 'ToolInventoryView', '🔧', 3, '启用', '2026-04-14 07:36:54', '2026-04-14 07:36:54');
INSERT INTO `menus` VALUES (6, 0, '月报', '/monthly-report', 'WeeklyReportView', '📊', 4, '启用', '2026-04-14 07:36:54', '2026-04-14 07:36:54');
INSERT INTO `menus` VALUES (7, 0, '员工管理', '/employee-management', 'EmployeeManagementView', '👨‍💼', 5, '启用', '2026-04-14 07:36:54', '2026-04-14 07:36:54');
INSERT INTO `menus` VALUES (9, 0, '文件存储', '/file-storage', 'FileStorageView', '📁', 7, '启用', '2026-04-14 07:36:54', '2026-04-14 07:36:54');
INSERT INTO `menus` VALUES (10, 0, '项目分类', '/project-category', 'ProjectCategoryView', '📂', 8, '启用', '2026-04-14 07:36:54', '2026-04-14 07:36:54');
INSERT INTO `menus` VALUES (11, 0, '成交项目', '/closing-project', 'ProjectClassificationView', '💰', 9, '启用', '2026-04-14 07:36:54', '2026-04-14 07:36:54');
INSERT INTO `menus` VALUES (12, 0, '销售漏斗', '/sales-funnel', 'SalesFunnelView', '📈', 10, '启用', '2026-04-14 07:36:54', '2026-04-14 07:36:54');
INSERT INTO `menus` VALUES (13, 0, 'OA办公', '/oa-office', 'OAWorkflowView', '📝', 3, '启用', '2026-07-14 02:36:37', '2026-07-14 02:36:37');
INSERT INTO `menus` VALUES (14, 0, '消息中心', '/message-center', 'MessageCenterView', '🔔', 12, '启用', '2026-07-17 08:41:40', '2026-07-17 09:00:28');
INSERT INTO `menus` VALUES (15, 0, '操作日志', '/operation-log', 'OperationLogView', '📋', 11, '启用', '2026-07-17 08:41:41', '2026-07-17 09:00:31');
INSERT INTO `menus` VALUES (16, 0, '知识库', '/knowledge-base', 'KnowledgeBaseView', '📚', 13, '启用', '2026-07-21 09:24:45', '2026-07-21 09:24:45');
INSERT INTO `menus` VALUES (18, 0, '销售目标', '/sales-target', 'SalesTargetView', '🎯', 14, '启用', '2026-07-22 09:22:10', '2026-07-22 09:22:10');
INSERT INTO `menus` VALUES (19, 0, '客户管理', '/customer-management', NULL, '👥', 15, '启用', '2026-07-22 09:22:10', '2026-07-22 09:22:10');
INSERT INTO `menus` VALUES (20, 0, '机会跟进', '/sales-opportunity', NULL, '💼', 16, '启用', '2026-07-22 09:22:10', '2026-07-22 09:22:10');

-- ----------------------------
-- Table structure for messages
-- ----------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chatId` bigint NOT NULL,
  `senderId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `time` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `isOwn` tinyint(1) NULL DEFAULT 0,
  `createdAt` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_chatId`(`chatId` ASC) USING BTREE,
  INDEX `idx_createdAt`(`createdAt` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of messages
-- ----------------------------
INSERT INTO `messages` VALUES (1, 1, '0', '欢迎大家加入公共聊天！', '16:57', 0, '2026-04-13 16:57:24');

-- ----------------------------
-- Table structure for notifications
-- ----------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'system',
  `relatedId` int NULL DEFAULT NULL,
  `relatedType` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `isRead` tinyint(1) NULL DEFAULT 0,
  `createdAt` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_notifications_userId`(`userId` ASC) USING BTREE,
  INDEX `idx_notifications_isRead`(`isRead` ASC) USING BTREE,
  INDEX `idx_notifications_createdAt`(`createdAt` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of notifications
-- ----------------------------
INSERT INTO `notifications` VALUES (1, '陈东', '请假审批提醒', '潘伟 提交了14天的事假申请，请审批', 'approval', NULL, NULL, 0, '2026-07-17 09:09:21');
INSERT INTO `notifications` VALUES (2, '潘伟', '请假已转发', '您的事假申请(14天)已转发至总经理审批', 'approval', NULL, NULL, 0, '2026-07-17 09:10:20');
INSERT INTO `notifications` VALUES (3, '潘伟', '请假已通过', '您的事假申请(14天)已通过', 'approval', NULL, NULL, 0, '2026-07-17 09:11:15');
INSERT INTO `notifications` VALUES (4, '陈东', '请假审批提醒', '潘伟 提交了8天的病假申请，请审批', 'approval', NULL, NULL, 0, '2026-07-17 09:13:40');
INSERT INTO `notifications` VALUES (5, '陈东', '请假审批提醒', '潘伟 提交了6天的事假申请，请审批', 'approval', NULL, NULL, 0, '2026-07-17 09:25:06');
INSERT INTO `notifications` VALUES (6, '潘伟', '请假已转发', '您的事假申请(6天)已转发至总经理审批', 'approval', NULL, NULL, 0, '2026-07-17 09:27:41');
INSERT INTO `notifications` VALUES (7, '陈东', '请假审批提醒', '潘伟 提交了6天的病假申请，请审批', 'approval', NULL, NULL, 0, '2026-07-17 09:35:31');
INSERT INTO `notifications` VALUES (8, '潘伟', '请假已转发', '您的病假申请(6天)已转发至总经理审批', 'approval', NULL, NULL, 0, '2026-07-17 09:37:32');
INSERT INTO `notifications` VALUES (9, '潘伟', '请假已通过', '您的病假申请(6天)已通过', 'approval', NULL, NULL, 0, '2026-07-17 09:38:49');
INSERT INTO `notifications` VALUES (10, '潘伟', '请假已通过', '您的事假申请(6天)已通过', 'approval', NULL, NULL, 0, '2026-07-17 09:39:47');
INSERT INTO `notifications` VALUES (11, '陈东', '请假审批提醒', '潘伟 提交了7天的年假申请，请审批', 'approval', NULL, NULL, 0, '2026-07-17 10:00:43');
INSERT INTO `notifications` VALUES (12, '潘伟', '请假已转发', '您的年假申请(7天)已转发至总经理审批', 'approval', NULL, NULL, 0, '2026-07-17 10:02:19');
INSERT INTO `notifications` VALUES (13, '潘伟', '请假已通过', '您的年假申请(7天)已通过', 'approval', NULL, NULL, 0, '2026-07-17 10:02:59');

-- ----------------------------
-- Table structure for oa_approval_flows
-- ----------------------------
DROP TABLE IF EXISTS `oa_approval_flows`;
CREATE TABLE `oa_approval_flows`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `flowCode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `flowName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '启用',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `flowCode`(`flowCode` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of oa_approval_flows
-- ----------------------------
INSERT INTO `oa_approval_flows` VALUES (1, 'leave', '请假审批', '员工请假申请审批流程', '启用', '2026-04-13 08:57:12', '2026-04-13 08:57:12');
INSERT INTO `oa_approval_flows` VALUES (2, 'reimburse', '报销审批', '费用报销申请审批流程', '启用', '2026-04-13 08:57:12', '2026-04-13 08:57:12');
INSERT INTO `oa_approval_flows` VALUES (3, 'purchase', '采购审批', '物品采购申请审批流程', '启用', '2026-04-13 08:57:12', '2026-04-13 08:57:12');
INSERT INTO `oa_approval_flows` VALUES (4, 'business_trip', '出差审批', '员工出差申请审批流程', '启用', '2026-04-13 08:57:12', '2026-04-13 08:57:12');
INSERT INTO `oa_approval_flows` VALUES (5, 'office_supplies', '办公用品申请', '办公用品申请审批流程', '启用', '2026-04-13 08:57:12', '2026-04-13 08:57:12');

-- ----------------------------
-- Table structure for oa_approval_history
-- ----------------------------
DROP TABLE IF EXISTS `oa_approval_history`;
CREATE TABLE `oa_approval_history`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `instanceId` int NOT NULL,
  `nodeOrder` int NOT NULL,
  `approverType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approverId` int NOT NULL,
  `approverName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `approverPosition` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_instanceId`(`instanceId` ASC) USING BTREE,
  INDEX `idx_approverId`(`approverId` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of oa_approval_history
-- ----------------------------

-- ----------------------------
-- Table structure for oa_approval_instances
-- ----------------------------
DROP TABLE IF EXISTS `oa_approval_instances`;
CREATE TABLE `oa_approval_instances`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `flowCode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantId` int NOT NULL,
  `applicantName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantDept` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicantPosition` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `businessType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `businessData` json NOT NULL,
  `currentApproverType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `currentApproverId` int NULL DEFAULT NULL,
  `currentApproverName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `approvalPath` json NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '审批中',
  `createdAt` datetime NOT NULL,
  `completedAt` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_applicantId`(`applicantId` ASC) USING BTREE,
  INDEX `idx_currentApproverId`(`currentApproverId` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_flowCode`(`flowCode` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of oa_approval_instances
-- ----------------------------

-- ----------------------------
-- Table structure for oa_approver_configs
-- ----------------------------
DROP TABLE IF EXISTS `oa_approver_configs`;
CREATE TABLE `oa_approver_configs`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `superiorPosition` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `isDeptManager` tinyint(1) NULL DEFAULT 0,
  `isTopManager` tinyint(1) NULL DEFAULT 0,
  `isFinanceDirector` tinyint(1) NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `dept_position_unique`(`department` ASC, `position` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of oa_approver_configs
-- ----------------------------
INSERT INTO `oa_approver_configs` VALUES (1, '技术部', '软件研发工程师', '项目经理', 0, 0, 0, '2026-04-13 08:57:12');
INSERT INTO `oa_approver_configs` VALUES (2, '技术部', '系统运维工程师', '项目经理', 0, 0, 0, '2026-04-13 08:57:12');
INSERT INTO `oa_approver_configs` VALUES (3, '技术部', '项目经理', '技术部经理', 0, 0, 0, '2026-04-13 08:57:12');
INSERT INTO `oa_approver_configs` VALUES (4, '技术部', '技术部经理', NULL, 1, 0, 0, '2026-04-13 08:57:12');
INSERT INTO `oa_approver_configs` VALUES (5, '销售部', '销售', '销售部经理', 0, 0, 0, '2026-04-13 08:57:12');
INSERT INTO `oa_approver_configs` VALUES (6, '销售部', '销售部经理', NULL, 1, 0, 0, '2026-04-13 08:57:12');
INSERT INTO `oa_approver_configs` VALUES (7, '财务部', '财务总监', NULL, 1, 0, 1, '2026-04-13 08:57:12');
INSERT INTO `oa_approver_configs` VALUES (8, '人力资源部', '人事经理', NULL, 1, 0, 0, '2026-04-13 08:57:12');
INSERT INTO `oa_approver_configs` VALUES (9, '管理部门', '总经理', NULL, 0, 1, 0, '2026-04-13 08:57:12');

-- ----------------------------
-- Table structure for office_supplies_applications
-- ----------------------------
DROP TABLE IF EXISTS `office_supplies_applications`;
CREATE TABLE `office_supplies_applications`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicant` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `itemName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '审批中',
  `approver` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `result` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of office_supplies_applications
-- ----------------------------

-- ----------------------------
-- Table structure for operation_logs
-- ----------------------------
DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `targetName` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `detail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `ipAddress` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `createdAt` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_operation_logs_userId`(`userId` ASC) USING BTREE,
  INDEX `idx_operation_logs_module`(`module` ASC) USING BTREE,
  INDEX `idx_operation_logs_action`(`action` ASC) USING BTREE,
  INDEX `idx_operation_logs_createdAt`(`createdAt` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 127 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of operation_logs
-- ----------------------------
INSERT INTO `operation_logs` VALUES (1, '6', '潘伟', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:09:00');
INSERT INTO `operation_logs` VALUES (2, '', '潘伟', 'submit', 'attendance', NULL, '事假请假(14天)', '提交给陈东审批', '', '2026-07-17 09:09:21');
INSERT INTO `operation_logs` VALUES (3, '91', '陈东', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:09:42');
INSERT INTO `operation_logs` VALUES (4, '', '系统', 'forward', 'attendance', NULL, '潘伟的事假请假', '暂时同意', '', '2026-07-17 09:10:20');
INSERT INTO `operation_logs` VALUES (5, '99', '李智鑫', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:10:49');
INSERT INTO `operation_logs` VALUES (6, '', '系统', 'approve', 'attendance', NULL, '潘伟的事假请假', '同意', '', '2026-07-17 09:11:15');
INSERT INTO `operation_logs` VALUES (7, '6', '潘伟', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:13:18');
INSERT INTO `operation_logs` VALUES (8, '', '潘伟', 'submit', 'attendance', NULL, '病假请假(8天)', '提交给陈东审批', '', '2026-07-17 09:13:40');
INSERT INTO `operation_logs` VALUES (9, '99', '李智鑫', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:13:55');
INSERT INTO `operation_logs` VALUES (10, '6', '潘伟', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:24:48');
INSERT INTO `operation_logs` VALUES (11, '', '潘伟', 'submit', 'attendance', NULL, '事假请假(6天)', '提交给陈东审批', '', '2026-07-17 09:25:07');
INSERT INTO `operation_logs` VALUES (12, '99', '李智鑫', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:26:46');
INSERT INTO `operation_logs` VALUES (13, '91', '陈东', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:27:25');
INSERT INTO `operation_logs` VALUES (14, '', '系统', 'forward', 'attendance', NULL, '潘伟的事假请假', 'tongyi1', '', '2026-07-17 09:27:41');
INSERT INTO `operation_logs` VALUES (15, '99', '李智鑫', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:29:13');
INSERT INTO `operation_logs` VALUES (16, '6', '潘伟', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:35:09');
INSERT INTO `operation_logs` VALUES (17, '', '潘伟', 'submit', 'attendance', NULL, '病假请假(6天)', '提交给陈东审批', '', '2026-07-17 09:35:31');
INSERT INTO `operation_logs` VALUES (18, '99', '李智鑫', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:36:26');
INSERT INTO `operation_logs` VALUES (19, '91', '陈东', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:37:08');
INSERT INTO `operation_logs` VALUES (20, '', '系统', 'forward', 'attendance', NULL, '潘伟的病假请假', 'tongyi', '', '2026-07-17 09:37:33');
INSERT INTO `operation_logs` VALUES (21, '99', '李智鑫', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 09:38:01');
INSERT INTO `operation_logs` VALUES (22, '', '系统', 'approve', 'attendance', NULL, '潘伟的病假请假', 'cada1', '', '2026-07-17 09:38:49');
INSERT INTO `operation_logs` VALUES (23, '', '系统', 'approve', 'attendance', NULL, '潘伟的事假请假', 'cefwq', '', '2026-07-17 09:39:47');
INSERT INTO `operation_logs` VALUES (24, '6', '潘伟', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 10:00:24');
INSERT INTO `operation_logs` VALUES (25, '', '潘伟', 'submit', 'attendance', NULL, '年假请假(7天)', '提交给陈东审批', '', '2026-07-17 10:00:43');
INSERT INTO `operation_logs` VALUES (26, '99', '李智鑫', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 10:01:30');
INSERT INTO `operation_logs` VALUES (27, '91', '陈东', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 10:01:50');
INSERT INTO `operation_logs` VALUES (28, '', '系统', 'forward', 'attendance', NULL, '潘伟的年假请假', '暂时同意', '', '2026-07-17 10:02:19');
INSERT INTO `operation_logs` VALUES (29, '99', '李智鑫', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 10:02:39');
INSERT INTO `operation_logs` VALUES (30, '', '系统', 'approve', 'attendance', NULL, '潘伟的年假请假', '同意', '', '2026-07-17 10:02:59');
INSERT INTO `operation_logs` VALUES (31, '6', '潘伟', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 10:04:10');
INSERT INTO `operation_logs` VALUES (32, '', '系统', 'create', 'sales', NULL, '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:15:31');
INSERT INTO `operation_logs` VALUES (33, '', '系统', 'create', 'sales', NULL, '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:15:32');
INSERT INTO `operation_logs` VALUES (34, '', '系统', 'create', 'sales', NULL, '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:15:33');
INSERT INTO `operation_logs` VALUES (35, '', '系统', 'delete', 'sales', '45', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:15:40');
INSERT INTO `operation_logs` VALUES (36, '', '系统', 'delete', 'sales', '44', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:15:45');
INSERT INTO `operation_logs` VALUES (37, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:15:51');
INSERT INTO `operation_logs` VALUES (38, '', '系统', 'update', 'sales', '43', '旗县销售数据\"凉城县\"', NULL, '', '2026-07-17 16:15:57');
INSERT INTO `operation_logs` VALUES (39, '', '系统', 'create', 'sales', NULL, '盟市销售数据\"包头市\"', NULL, '', '2026-07-17 16:16:33');
INSERT INTO `operation_logs` VALUES (40, '', '系统', 'create', 'sales', NULL, '旗县销售数据\"土默特右旗\"', NULL, '', '2026-07-17 16:16:41');
INSERT INTO `operation_logs` VALUES (41, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:17:30');
INSERT INTO `operation_logs` VALUES (42, '', '系统', 'update', 'sales', '43', '旗县销售数据\"凉城县\"', NULL, '', '2026-07-17 16:21:37');
INSERT INTO `operation_logs` VALUES (43, '', '系统', 'update', 'sales', '43', '旗县销售数据\"凉城县\"', NULL, '', '2026-07-17 16:21:45');
INSERT INTO `operation_logs` VALUES (44, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:43');
INSERT INTO `operation_logs` VALUES (45, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:43');
INSERT INTO `operation_logs` VALUES (46, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:43');
INSERT INTO `operation_logs` VALUES (47, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:43');
INSERT INTO `operation_logs` VALUES (48, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:43');
INSERT INTO `operation_logs` VALUES (49, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:43');
INSERT INTO `operation_logs` VALUES (50, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:46');
INSERT INTO `operation_logs` VALUES (51, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:51');
INSERT INTO `operation_logs` VALUES (52, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:51');
INSERT INTO `operation_logs` VALUES (53, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:51');
INSERT INTO `operation_logs` VALUES (54, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:51');
INSERT INTO `operation_logs` VALUES (55, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:51');
INSERT INTO `operation_logs` VALUES (56, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:51');
INSERT INTO `operation_logs` VALUES (57, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:52');
INSERT INTO `operation_logs` VALUES (58, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:53');
INSERT INTO `operation_logs` VALUES (59, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:53');
INSERT INTO `operation_logs` VALUES (60, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:53');
INSERT INTO `operation_logs` VALUES (61, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:53');
INSERT INTO `operation_logs` VALUES (62, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:53');
INSERT INTO `operation_logs` VALUES (63, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:57');
INSERT INTO `operation_logs` VALUES (64, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:57');
INSERT INTO `operation_logs` VALUES (65, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 16:29:57');
INSERT INTO `operation_logs` VALUES (66, '', '系统', 'update', 'sales', '43', '旗县销售数据\"凉城县\"', NULL, '', '2026-07-17 16:30:07');
INSERT INTO `operation_logs` VALUES (67, '', '系统', 'create', 'system', '14', '��Ϣ����', '创建菜单: ��Ϣ����', '127.0.0.1', '2026-07-17 16:41:41');
INSERT INTO `operation_logs` VALUES (68, '', '系统', 'create', 'system', '15', '������־', '创建菜单: ������־', '127.0.0.1', '2026-07-17 16:41:41');
INSERT INTO `operation_logs` VALUES (69, '', '系统', 'update', 'system', '6', '角色ID: 6', '分配角色权限', '127.0.0.1', '2026-07-17 16:42:51');
INSERT INTO `operation_logs` VALUES (70, '', '系统', 'update', 'system', '1', '角色ID: 1', '分配角色权限', '127.0.0.1', '2026-07-17 16:42:51');
INSERT INTO `operation_logs` VALUES (71, '', '系统', 'update', 'system', '14', '��Ϣ����', '更新菜单: ��Ϣ����', '127.0.0.1', '2026-07-17 16:59:10');
INSERT INTO `operation_logs` VALUES (72, '', '系统', 'update', 'system', '15', '������־', '更新菜单: ������־', '127.0.0.1', '2026-07-17 16:59:10');
INSERT INTO `operation_logs` VALUES (73, '', '系统', 'update', 'system', '14', '消息中心', '更新菜单: 消息中心', '127.0.0.1', '2026-07-17 16:59:59');
INSERT INTO `operation_logs` VALUES (74, '', '系统', 'update', 'system', '15', '操作日志', '更新菜单: 操作日志', '127.0.0.1', '2026-07-17 17:00:01');
INSERT INTO `operation_logs` VALUES (75, '', '系统', 'update', 'system', '14', '消息中心', '更新菜单: 消息中心', '127.0.0.1', '2026-07-17 17:00:29');
INSERT INTO `operation_logs` VALUES (76, '', '系统', 'update', 'system', '15', '操作日志', '更新菜单: 操作日志', '127.0.0.1', '2026-07-17 17:00:31');
INSERT INTO `operation_logs` VALUES (77, '', '系统', 'update', 'system', '2', '角色ID: 2', '分配角色权限', '127.0.0.1', '2026-07-17 17:05:12');
INSERT INTO `operation_logs` VALUES (78, '', '系统', 'update', 'system', '3', '角色ID: 3', '分配角色权限', '127.0.0.1', '2026-07-17 17:05:18');
INSERT INTO `operation_logs` VALUES (79, '', '系统', 'update', 'system', '4', '角色ID: 4', '分配角色权限', '127.0.0.1', '2026-07-17 17:05:24');
INSERT INTO `operation_logs` VALUES (80, '', '系统', 'update', 'system', '5', '角色ID: 5', '分配角色权限', '127.0.0.1', '2026-07-17 17:05:31');
INSERT INTO `operation_logs` VALUES (81, '', '系统', 'update', 'system', '6', '角色ID: 6', '分配角色权限', '127.0.0.1', '2026-07-17 17:05:37');
INSERT INTO `operation_logs` VALUES (82, '', '系统', 'update', 'system', '1', '角色ID: 1', '分配角色权限', '127.0.0.1', '2026-07-17 17:05:40');
INSERT INTO `operation_logs` VALUES (83, '91', '陈东', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 17:06:00');
INSERT INTO `operation_logs` VALUES (84, '6', '潘伟', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-17 17:14:59');
INSERT INTO `operation_logs` VALUES (85, '', '系统', 'update', 'sales', '46', '旗县销售数据\"集宁\"', NULL, '', '2026-07-17 17:20:56');
INSERT INTO `operation_logs` VALUES (86, '', '系统', 'delete', 'project', NULL, '运营项目', '删除项目分类: 运营项目', '', '2026-07-17 17:52:14');
INSERT INTO `operation_logs` VALUES (87, '', '系统', 'update', 'project', NULL, '市场项目', '项目类型更新: 研发项目 -> 市场项目', '', '2026-07-17 17:53:03');
INSERT INTO `operation_logs` VALUES (88, '', '系统', 'delete', 'project', NULL, '基建项目', '删除项目分类: 基建项目', '', '2026-07-17 17:54:05');
INSERT INTO `operation_logs` VALUES (89, '', '系统', 'delete', 'project', NULL, '市场项目', '删除项目分类: 市场项目', '', '2026-07-17 17:54:08');
INSERT INTO `operation_logs` VALUES (90, '', '系统', 'create', 'sales', NULL, '旗县销售数据\"兴和县\"', NULL, '', '2026-07-17 17:54:39');
INSERT INTO `operation_logs` VALUES (91, '', '系统', 'update', 'project', NULL, '项目分类\"研发项目\"负责人变更为潘伟', NULL, '', '2026-07-20 10:24:08');
INSERT INTO `operation_logs` VALUES (92, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026�?{month}月', '新增周报: 2026�?{month}月', '', '2026-07-20 10:31:40');
INSERT INTO `operation_logs` VALUES (93, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年2月', '新增周报: 2026年2月', '', '2026-07-20 11:44:18');
INSERT INTO `operation_logs` VALUES (94, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年4月', '新增周报: 2026年4月', '', '2026-07-20 11:52:55');
INSERT INTO `operation_logs` VALUES (95, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年8月', '新增周报: 2026年8月', '', '2026-07-20 11:53:49');
INSERT INTO `operation_logs` VALUES (96, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年5月', '新增周报: 2026年5月', '', '2026-07-20 11:59:46');
INSERT INTO `operation_logs` VALUES (97, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年6月 ', '新增周报: 2026年6月 ', '', '2026-07-20 14:47:27');
INSERT INTO `operation_logs` VALUES (98, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年8月', '新增周报: 2026年8月', '', '2026-07-20 14:51:03');
INSERT INTO `operation_logs` VALUES (99, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年5月', '新增周报: 2026年5月', '', '2026-07-20 15:02:58');
INSERT INTO `operation_logs` VALUES (100, '', '系统', 'update', 'weekly_report', NULL, '周报: 2026年5月', '更新周报: 2026年5月 (ID: 8)', '', '2026-07-20 15:28:30');
INSERT INTO `operation_logs` VALUES (101, '6', '潘伟', 'login', 'auth', NULL, NULL, '用户登录系统', '127.0.0.1', '2026-07-20 15:29:40');
INSERT INTO `operation_logs` VALUES (102, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年8月', '新增周报: 2026年8月', '', '2026-07-20 15:31:16');
INSERT INTO `operation_logs` VALUES (103, '', '系统', 'update', 'weekly_report', NULL, '周报: 2026�?{month}月', '更新周报: 2026�?{month}月 (ID: 1)', '', '2026-07-20 15:32:04');
INSERT INTO `operation_logs` VALUES (104, '', '系统', 'update', 'weekly_report', NULL, '周报: 2026年2月', '更新周报: 2026年2月 (ID: 2)', '', '2026-07-20 15:32:10');
INSERT INTO `operation_logs` VALUES (105, '', '系统', 'update', 'weekly_report', NULL, '周报: 2026年4月', '更新周报: 2026年4月 (ID: 3)', '', '2026-07-20 15:32:17');
INSERT INTO `operation_logs` VALUES (106, '', '系统', 'update', 'weekly_report', NULL, '周报: 2026年5月', '更新周报: 2026年5月 (ID: 5)', '', '2026-07-20 15:32:23');
INSERT INTO `operation_logs` VALUES (107, '', '系统', 'update', 'weekly_report', NULL, '周报: 2026年6月 ', '更新周报: 2026年6月  (ID: 6)', '', '2026-07-20 15:32:27');
INSERT INTO `operation_logs` VALUES (108, '', '系统', 'update', 'weekly_report', NULL, '周报: 2026年5月', '更新周报: 2026年5月 (ID: 8)', '', '2026-07-20 15:32:31');
INSERT INTO `operation_logs` VALUES (109, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 15:46:06');
INSERT INTO `operation_logs` VALUES (110, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 15:47:04');
INSERT INTO `operation_logs` VALUES (111, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 15:51:59');
INSERT INTO `operation_logs` VALUES (112, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 15:52:12');
INSERT INTO `operation_logs` VALUES (113, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 16:15:04');
INSERT INTO `operation_logs` VALUES (114, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 16:15:35');
INSERT INTO `operation_logs` VALUES (115, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 16:24:46');
INSERT INTO `operation_logs` VALUES (116, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 16:24:46');
INSERT INTO `operation_logs` VALUES (117, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 16:40:22');
INSERT INTO `operation_logs` VALUES (118, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年1月', '新增周报: 2026年1月', '', '2026-07-20 16:40:56');
INSERT INTO `operation_logs` VALUES (119, '', '系统', 'create', 'weekly_report', NULL, '周报: 2026年2月', '新增周报: 2026年2月', '', '2026-07-20 16:41:21');
INSERT INTO `operation_logs` VALUES (120, '', '系统', 'create', 'sales', NULL, '盟市销售数据\"锡林郭勒盟\"', NULL, '', '2026-07-20 17:41:23');
INSERT INTO `operation_logs` VALUES (121, '', '系统', 'create', 'sales', NULL, '盟市销售数据\"赤峰市\"', NULL, '', '2026-07-20 17:41:32');
INSERT INTO `operation_logs` VALUES (122, '', '系统', 'create', 'sales', NULL, '盟市销售数据\"兴安盟\"', NULL, '', '2026-07-20 17:41:34');
INSERT INTO `operation_logs` VALUES (123, '', '系统', 'create', 'sales', NULL, '盟市销售数据\"巴彦淖尔市\"', NULL, '', '2026-07-20 17:42:24');
INSERT INTO `operation_logs` VALUES (124, '', '系统', 'create', 'sales', NULL, '盟市销售数据\"鄂尔多斯市\"', NULL, '', '2026-07-20 17:51:34');
INSERT INTO `operation_logs` VALUES (125, '', '系统', 'create', 'sales', NULL, '旗县销售数据\"凉城县\"', NULL, '', '2026-07-20 17:51:48');
INSERT INTO `operation_logs` VALUES (126, '', '系统', 'delete', 'system', '17', '菜单ID: 17', '删除菜单 ID: 17', '127.0.0.1', '2026-07-21 15:20:01');

-- ----------------------------
-- Table structure for process_definitions
-- ----------------------------
DROP TABLE IF EXISTS `process_definitions`;
CREATE TABLE `process_definitions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `version` int NULL DEFAULT 1,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'draft',
  `nodes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `edges` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_schema` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `code`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of process_definitions
-- ----------------------------

-- ----------------------------
-- Table structure for process_instances
-- ----------------------------
DROP TABLE IF EXISTS `process_instances`;
CREATE TABLE `process_instances`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `definition_id` int NOT NULL,
  `business_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `business_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `applicant_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicant_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'running',
  `current_nodes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `variables` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `active_multi_tasks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `branch_contexts` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `start_time` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_definition`(`definition_id` ASC) USING BTREE,
  INDEX `idx_applicant`(`applicant_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of process_instances
-- ----------------------------

-- ----------------------------
-- Table structure for process_tasks
-- ----------------------------
DROP TABLE IF EXISTS `process_tasks`;
CREATE TABLE `process_tasks`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `instance_id` int NOT NULL,
  `node_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `node_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `node_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `assignee_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `assignee_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'pending',
  `action` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `parent_task_id` int NULL DEFAULT NULL,
  `is_multi_node` tinyint NULL DEFAULT 0,
  `multi_node_strategy` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime NULL DEFAULT NULL,
  `due_date` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_instance`(`instance_id` ASC) USING BTREE,
  INDEX `idx_assignee`(`assignee_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_parent`(`parent_task_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of process_tasks
-- ----------------------------

-- ----------------------------
-- Table structure for project_applications
-- ----------------------------
DROP TABLE IF EXISTS `project_applications`;
CREATE TABLE `project_applications`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicant_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicant_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `budget` decimal(15, 2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `objectives` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_members` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `resources` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `attachments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'pending',
  `approver` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `current_step` int NULL DEFAULT 1,
  `current_approvers` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `approval_history` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `project_link` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `project_code`(`project_code` ASC) USING BTREE,
  INDEX `idx_applicant`(`applicant_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_department`(`department` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 68 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of project_applications
-- ----------------------------
INSERT INTO `project_applications` VALUES (64, 'PRJ959684', '项目1', '6', '潘伟', '', '研发项目', '高', 1000.00, '2026-07-20', '2026-08-19', '这是项目1', '项目1的目标', '[30,31]', '资源描述', NULL, 'pending', NULL, 1, NULL, NULL, NULL, '2026-07-20 09:29:20', '2026-07-20 10:24:08', '');
INSERT INTO `project_applications` VALUES (65, 'PRJ959786', '项目2', '6', '潘伟', '', '研发项目', '高', 1000.00, '2026-07-20', '2026-08-19', '项目2的详细描述', '项目2的目标', '[30,31]', '资源描述', NULL, 'pending', NULL, 1, NULL, NULL, NULL, '2026-07-20 09:29:20', '2026-07-20 10:24:08', '');
INSERT INTO `project_applications` VALUES (67, 'PRJ960114', '项目4', '6', '潘伟', '', '研发项目', '高', 1000.00, '2026-07-20', '2026-08-19', '项目4的详细描述', '项目4的目标', '[30,31]', '资源描述', NULL, 'pending', NULL, 1, NULL, NULL, NULL, '2026-07-20 09:29:20', '2026-07-20 10:24:08', '');

-- ----------------------------
-- Table structure for projects
-- ----------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of projects
-- ----------------------------

-- ----------------------------
-- Table structure for provinces
-- ----------------------------
DROP TABLE IF EXISTS `provinces`;
CREATE TABLE `provinces`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `name`(`name` ASC) USING BTREE,
  UNIQUE INDEX `code`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 11 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of provinces
-- ----------------------------
INSERT INTO `provinces` VALUES (1, '内蒙古自治区', '150000', '2026-04-13 08:56:59');
INSERT INTO `provinces` VALUES (2, '北京市', '110000', '2026-04-13 08:56:59');
INSERT INTO `provinces` VALUES (3, '上海市', '310000', '2026-04-13 08:56:59');
INSERT INTO `provinces` VALUES (4, '广东省', '440000', '2026-04-13 08:56:59');
INSERT INTO `provinces` VALUES (5, '江苏省', '320000', '2026-04-13 08:56:59');
INSERT INTO `provinces` VALUES (6, '浙江省', '330000', '2026-04-13 08:56:59');
INSERT INTO `provinces` VALUES (7, '山东省', '370000', '2026-04-13 08:56:59');
INSERT INTO `provinces` VALUES (8, '河南省', '410000', '2026-04-13 08:56:59');
INSERT INTO `provinces` VALUES (9, '四川省', '510000', '2026-04-13 08:56:59');
INSERT INTO `provinces` VALUES (10, '湖北省', '420000', '2026-04-13 08:56:59');

-- ----------------------------
-- Table structure for reimbursements
-- ----------------------------
DROP TABLE IF EXISTS `reimbursements`;
CREATE TABLE `reimbursements`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `applicant` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reimburseType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10, 2) NOT NULL,
  `reimburseDate` date NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '审批中',
  `approver` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `result` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `attachments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of reimbursements
-- ----------------------------

-- ----------------------------
-- Table structure for role_permissions
-- ----------------------------
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `roleId` int NOT NULL,
  `menuId` int NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `role_menu_unique`(`roleId` ASC, `menuId` ASC) USING BTREE,
  INDEX `menuId`(`menuId` ASC) USING BTREE,
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 253 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of role_permissions
-- ----------------------------
INSERT INTO `role_permissions` VALUES (180, 2, 5, '2026-07-17 09:05:12');
INSERT INTO `role_permissions` VALUES (181, 2, 13, '2026-07-17 09:05:12');
INSERT INTO `role_permissions` VALUES (182, 2, 6, '2026-07-17 09:05:12');
INSERT INTO `role_permissions` VALUES (183, 2, 7, '2026-07-17 09:05:12');
INSERT INTO `role_permissions` VALUES (184, 2, 9, '2026-07-17 09:05:12');
INSERT INTO `role_permissions` VALUES (185, 2, 10, '2026-07-17 09:05:12');
INSERT INTO `role_permissions` VALUES (186, 2, 15, '2026-07-17 09:05:12');
INSERT INTO `role_permissions` VALUES (187, 2, 14, '2026-07-17 09:05:12');
INSERT INTO `role_permissions` VALUES (188, 3, 5, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (189, 3, 13, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (190, 3, 6, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (191, 3, 7, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (192, 3, 9, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (193, 3, 10, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (194, 3, 11, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (195, 3, 12, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (196, 3, 15, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (197, 3, 14, '2026-07-17 09:05:18');
INSERT INTO `role_permissions` VALUES (198, 4, 5, '2026-07-17 09:05:24');
INSERT INTO `role_permissions` VALUES (199, 4, 13, '2026-07-17 09:05:24');
INSERT INTO `role_permissions` VALUES (200, 4, 6, '2026-07-17 09:05:24');
INSERT INTO `role_permissions` VALUES (201, 4, 7, '2026-07-17 09:05:24');
INSERT INTO `role_permissions` VALUES (202, 4, 9, '2026-07-17 09:05:24');
INSERT INTO `role_permissions` VALUES (203, 4, 10, '2026-07-17 09:05:24');
INSERT INTO `role_permissions` VALUES (204, 4, 11, '2026-07-17 09:05:24');
INSERT INTO `role_permissions` VALUES (205, 4, 15, '2026-07-17 09:05:24');
INSERT INTO `role_permissions` VALUES (206, 4, 14, '2026-07-17 09:05:24');
INSERT INTO `role_permissions` VALUES (207, 5, 5, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (208, 5, 13, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (209, 5, 6, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (210, 5, 7, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (211, 5, 9, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (212, 5, 10, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (213, 5, 11, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (214, 5, 12, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (215, 5, 15, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (216, 5, 14, '2026-07-17 09:05:31');
INSERT INTO `role_permissions` VALUES (217, 6, 5, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (218, 6, 13, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (219, 6, 6, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (220, 6, 7, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (221, 6, 9, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (222, 6, 10, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (223, 6, 11, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (224, 6, 12, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (225, 6, 15, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (226, 6, 14, '2026-07-17 09:05:37');
INSERT INTO `role_permissions` VALUES (227, 1, 1, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (228, 1, 5, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (229, 1, 13, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (230, 1, 6, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (231, 1, 7, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (232, 1, 9, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (233, 1, 10, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (234, 1, 11, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (235, 1, 12, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (236, 1, 15, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (237, 1, 14, '2026-07-17 09:05:40');
INSERT INTO `role_permissions` VALUES (238, 1, 16, '2026-07-21 09:25:00');
INSERT INTO `role_permissions` VALUES (240, 2, 16, '2026-07-21 09:25:00');
INSERT INTO `role_permissions` VALUES (242, 3, 16, '2026-07-21 09:25:00');
INSERT INTO `role_permissions` VALUES (244, 4, 16, '2026-07-21 09:25:00');
INSERT INTO `role_permissions` VALUES (246, 5, 16, '2026-07-21 09:25:00');
INSERT INTO `role_permissions` VALUES (248, 6, 16, '2026-07-21 09:25:00');
INSERT INTO `role_permissions` VALUES (250, 1, 18, '2026-07-22 09:22:10');
INSERT INTO `role_permissions` VALUES (251, 1, 19, '2026-07-22 09:22:10');
INSERT INTO `role_permissions` VALUES (252, 1, 20, '2026-07-22 09:22:10');

-- ----------------------------
-- Table structure for roles
-- ----------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '启用',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `code`(`code` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of roles
-- ----------------------------
INSERT INTO `roles` VALUES (1, '系统管理员', 'admin', '系统超级管理员，拥有所有权限', '启用', '2026-04-13 08:57:15', '2026-04-13 08:57:15');
INSERT INTO `roles` VALUES (2, '普通员工', 'employee', '普通员工角色', '启用', '2026-04-13 08:57:15', '2026-04-13 08:57:15');
INSERT INTO `roles` VALUES (3, '财务总监', 'Financial Director', '全权负责一切财务相关内容', '启用', '2026-07-13 07:06:45', '2026-07-13 07:06:45');
INSERT INTO `roles` VALUES (4, '技术部经理', 'Technical Department Manager', '全权负责技术部一切事务', '启用', '2026-07-13 07:11:47', '2026-07-13 07:11:47');
INSERT INTO `roles` VALUES (5, '销售部经理', 'Sales Department Manager', '全权负责销售部一切事务', '启用', '2026-07-13 07:13:38', '2026-07-13 07:13:38');
INSERT INTO `roles` VALUES (6, '总经理', 'General Manager', '全权负责所有人员的一切事务', '启用', '2026-07-13 07:30:05', '2026-07-13 07:30:05');

-- ----------------------------
-- Table structure for sales_funnel_data
-- ----------------------------
DROP TABLE IF EXISTS `sales_funnel_data`;
CREATE TABLE `sales_funnel_data`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `stageId` int NOT NULL,
  `count` int NOT NULL,
  `amount` decimal(10, 2) NOT NULL,
  `date` date NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `stageId`(`stageId` ASC) USING BTREE,
  CONSTRAINT `sales_funnel_data_ibfk_1` FOREIGN KEY (`stageId`) REFERENCES `sales_funnel_stages` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1783 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sales_funnel_data
-- ----------------------------
INSERT INTO `sales_funnel_data` VALUES (1778, 1, 48, 0.00, '2026-07-22', '2026-07-22 00:52:02');
INSERT INTO `sales_funnel_data` VALUES (1779, 2, 0, 0.00, '2026-07-22', '2026-07-22 00:52:02');
INSERT INTO `sales_funnel_data` VALUES (1780, 3, 0, 0.00, '2026-07-22', '2026-07-22 00:52:02');
INSERT INTO `sales_funnel_data` VALUES (1781, 4, 0, 0.00, '2026-07-22', '2026-07-22 00:52:02');
INSERT INTO `sales_funnel_data` VALUES (1782, 5, 0, 0.00, '2026-07-22', '2026-07-22 00:52:02');

-- ----------------------------
-- Table structure for sales_funnel_stages
-- ----------------------------
DROP TABLE IF EXISTS `sales_funnel_stages`;
CREATE TABLE `sales_funnel_stages`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderIndex` int NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sales_funnel_stages
-- ----------------------------
INSERT INTO `sales_funnel_stages` VALUES (1, '潜在客户', 1, '2026-04-13 08:57:16');
INSERT INTO `sales_funnel_stages` VALUES (2, '意向客户', 2, '2026-04-13 08:57:16');
INSERT INTO `sales_funnel_stages` VALUES (3, '提案阶段', 3, '2026-04-13 08:57:16');
INSERT INTO `sales_funnel_stages` VALUES (4, '谈判阶段', 4, '2026-04-13 08:57:16');
INSERT INTO `sales_funnel_stages` VALUES (5, '成交客户', 5, '2026-04-13 08:57:16');

-- ----------------------------
-- Table structure for sales_targets
-- ----------------------------
DROP TABLE IF EXISTS `sales_targets`;
CREATE TABLE `sales_targets`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `managerId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `managerName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '',
  `year` int NOT NULL,
  `month` int NOT NULL,
  `targetAmount` decimal(15, 2) NULL DEFAULT 0.00,
  `createdAt` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_manager_month`(`managerId` ASC, `year` ASC, `month` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sales_targets
-- ----------------------------
INSERT INTO `sales_targets` VALUES (1, '1', '���Ը�����', 2026, 7, 100000.00, '2026-07-21 16:49:46', '2026-07-21 16:52:51');
INSERT INTO `sales_targets` VALUES (2, '10', '', 2026, 7, 0.00, '2026-07-21 16:52:51', '2026-07-21 16:52:51');
INSERT INTO `sales_targets` VALUES (3, '11', '', 2026, 7, 0.00, '2026-07-21 16:52:51', '2026-07-21 16:52:51');
INSERT INTO `sales_targets` VALUES (4, '12', '', 2026, 7, 0.00, '2026-07-21 16:52:51', '2026-07-21 16:52:51');
INSERT INTO `sales_targets` VALUES (5, '13', '', 2026, 7, 0.00, '2026-07-21 16:52:51', '2026-07-21 16:52:51');
INSERT INTO `sales_targets` VALUES (6, '14', '', 2026, 7, 0.00, '2026-07-21 16:52:51', '2026-07-21 16:52:51');
INSERT INTO `sales_targets` VALUES (7, '15', '', 2026, 7, 0.00, '2026-07-21 16:52:51', '2026-07-21 16:52:51');
INSERT INTO `sales_targets` VALUES (8, '16', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (9, '17', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (10, '18', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (11, '19', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (12, '2', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (13, '20', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (14, '3', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (15, '4', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (16, '5', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (17, '6', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (18, '7', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (19, '8', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');
INSERT INTO `sales_targets` VALUES (20, '9', '', 2026, 7, 0.00, '2026-07-21 16:52:52', '2026-07-21 16:52:52');

-- ----------------------------
-- Table structure for tools
-- ----------------------------
DROP TABLE IF EXISTS `tools`;
CREATE TABLE `tools`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(18, 2) NOT NULL,
  `supplier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entryDate` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 24 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of tools
-- ----------------------------

-- ----------------------------
-- Table structure for town_sales
-- ----------------------------
DROP TABLE IF EXISTS `town_sales`;
CREATE TABLE `town_sales`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `countyId` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactPerson` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactPhone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `manager` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `customer_manager` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '',
  `our_manager` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '',
  `intention` int NOT NULL,
  `requirement` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `isDealed` tinyint(1) NULL DEFAULT 0,
  `sales` decimal(10, 2) NULL DEFAULT 0.00,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `countyId`(`countyId` ASC) USING BTREE,
  CONSTRAINT `town_sales_ibfk_1` FOREIGN KEY (`countyId`) REFERENCES `county_sales` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 152 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of town_sales
-- ----------------------------
INSERT INTO `town_sales` VALUES (104, 152, '凉城县永兴镇', '镇府，经管所/农经站', '', NULL, '1', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:32');
INSERT INTO `town_sales` VALUES (105, 152, '凉城县岱海镇', '镇府，经管所/农经站', '13789545077/0474-4486627', NULL, '2', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:33');
INSERT INTO `town_sales` VALUES (106, 152, '凉城县麦胡图镇', '镇府，经管所/农经站', '15547413550', NULL, '3', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:34');
INSERT INTO `town_sales` VALUES (107, 152, '凉城县六苏木镇', '镇府，经管所/农经站', '18004869843', NULL, '4', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:34');
INSERT INTO `town_sales` VALUES (108, 152, '凉城县天成乡', '镇府，经管所/农经站', '', NULL, '5', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:34');
INSERT INTO `town_sales` VALUES (109, 152, '凉城县鸿茅镇', '镇府，经管所/农经站', '', NULL, '6', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:35');
INSERT INTO `town_sales` VALUES (110, 152, '凉城县蛮汉镇', '镇府，经管所/农经站', '15624648706', NULL, '7', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:35');
INSERT INTO `town_sales` VALUES (111, 153, '卓资县旗下营镇', '镇府，经管所/农经站', '未给电话', NULL, '8', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:35');
INSERT INTO `town_sales` VALUES (112, 153, '卓资县梨花镇', '镇府，经管所/农经站', '', NULL, '9', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:36');
INSERT INTO `town_sales` VALUES (113, 153, '卓资县卓资山镇', '镇府，经管所/农经站', '', NULL, '10', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:36');
INSERT INTO `town_sales` VALUES (114, 153, '卓资县巴音锡勒镇', '镇府，经管所/农经站', '未给', NULL, '11', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:36');
INSERT INTO `town_sales` VALUES (115, 154, '兴和县五股泉乡', '镇府，经管所/农经站', '', NULL, '12', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:37');
INSERT INTO `town_sales` VALUES (116, 154, '兴和县鄂尔栋镇', '镇府，经管所/农经站', '', NULL, '13', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:37');
INSERT INTO `town_sales` VALUES (117, 154, '兴和县张皋镇', '镇府，经管所/农经站', '13947662350', NULL, '14', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:38');
INSERT INTO `town_sales` VALUES (118, 155, '商都县小海子镇', '镇府，经管所/农经站', '无', NULL, '15', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:38');
INSERT INTO `town_sales` VALUES (119, 156, '化德县朝阳镇', '镇府，经管所/农经站', '无', NULL, '16', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:38');
INSERT INTO `town_sales` VALUES (120, 156, '化德县公腊胡洞乡', '镇府，经管所/农经站', '无', NULL, '17', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:39');
INSERT INTO `town_sales` VALUES (121, 156, '化德县德包图乡', '镇府，经管所/农经站', '无', NULL, '18', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:39');
INSERT INTO `town_sales` VALUES (122, 155, '商都县玻璃忽镜乡', '镇府，经管所/农经站', '未给', NULL, '19', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:39');
INSERT INTO `town_sales` VALUES (123, 155, '商都县七台镇', '镇府，经管所/农经站', '无', NULL, '20', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:39');
INSERT INTO `town_sales` VALUES (124, 157, '察哈尔右翼前旗平地泉镇', '镇府，经管所/农经站', '15848069955', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:40');
INSERT INTO `town_sales` VALUES (125, 157, '察哈尔右翼前旗黄旗海镇', '镇府，经管所/农经站', '15144895267', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:40');
INSERT INTO `town_sales` VALUES (126, 157, '察哈尔右翼前旗巴音塔拉镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:40');
INSERT INTO `town_sales` VALUES (127, 158, '察哈尔右翼中旗科布尔镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:40');
INSERT INTO `town_sales` VALUES (128, 158, '察哈尔右翼中旗铁沙盖镇165', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:41');
INSERT INTO `town_sales` VALUES (129, 158, '察哈尔右翼中旗黄羊城镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:41');
INSERT INTO `town_sales` VALUES (130, 158, '察哈尔右翼中旗广益隆镇169', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:42');
INSERT INTO `town_sales` VALUES (131, 158, '察哈尔右翼中旗土城子乡167', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:42');
INSERT INTO `town_sales` VALUES (132, 159, '察哈尔右翼后旗白音察干镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:44');
INSERT INTO `town_sales` VALUES (133, 159, '察哈尔右翼后旗土牧尔台镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:45');
INSERT INTO `town_sales` VALUES (134, 159, '察哈尔右翼后旗红格尔图镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:45');
INSERT INTO `town_sales` VALUES (135, 159, '察哈尔右翼后旗贲红镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:45');
INSERT INTO `town_sales` VALUES (136, 160, '丰镇市隆盛庄镇', '镇府，经管所/农经站', '13947453213', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:45');
INSERT INTO `town_sales` VALUES (137, 161, '丰镇市红砂坝镇', '镇府，经管所/农经站', '13847432196', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:46');
INSERT INTO `town_sales` VALUES (138, 162, '‌丰镇市巨宝庄镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:46');
INSERT INTO `town_sales` VALUES (139, 163, '‌丰镇市黑土台镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:46');
INSERT INTO `town_sales` VALUES (140, 164, '土默特左旗北什轴乡', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:46');
INSERT INTO `town_sales` VALUES (141, 164, '土默特左旗毕克齐镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:47');
INSERT INTO `town_sales` VALUES (142, 164, '土默特左旗白庙子镇', '镇府，经管所/农经站', '15024931363', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:47');
INSERT INTO `town_sales` VALUES (143, 164, '土默特左旗台阁牧镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:47');
INSERT INTO `town_sales` VALUES (144, 165, '武川县哈乐镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:47');
INSERT INTO `town_sales` VALUES (145, 165, '武川县西乌兰不浪镇', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:48');
INSERT INTO `town_sales` VALUES (146, 165, '武川县大青山乡', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:48');
INSERT INTO `town_sales` VALUES (147, 165, '武川县上秃亥乡', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:48');
INSERT INTO `town_sales` VALUES (148, 166, '四子王旗库伦图镇', '镇府，经管所/农经站', '15024925025', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:48');
INSERT INTO `town_sales` VALUES (149, 166, '四子王旗东八号乡', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:49');
INSERT INTO `town_sales` VALUES (150, 166, '四子王旗忽鸡图乡', '镇府，经管所/农经站', '15949475877', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:49');
INSERT INTO `town_sales` VALUES (151, 166, '四子王旗大黑河乡', '镇府，经管所/农经站', '', NULL, '', '', '', 1, '', 0, 0.00, '2026-07-20 09:50:49');

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`username` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 100 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, '总经理', '111111', '2026-04-13 08:57:16');
INSERT INTO `users` VALUES (6, '潘伟', '333333', '2026-04-13 08:57:23');
INSERT INTO `users` VALUES (90, '管理员', '123456', '2026-06-16 03:29:06');
INSERT INTO `users` VALUES (91, '陈东', '123456', '2026-06-16 03:29:06');
INSERT INTO `users` VALUES (92, '李志娟', '123456', '2026-06-16 07:07:06');
INSERT INTO `users` VALUES (93, '娜慕罕', '123456', '2026-06-16 07:07:06');
INSERT INTO `users` VALUES (95, '张海琼', '123456', '2026-07-13 07:15:20');
INSERT INTO `users` VALUES (97, '邢誉露', '123456', '2026-07-13 07:21:17');
INSERT INTO `users` VALUES (99, '李智鑫', '111111', '2026-07-13 07:23:46');

-- ----------------------------
-- Table structure for visit_records
-- ----------------------------
DROP TABLE IF EXISTS `visit_records`;
CREATE TABLE `visit_records`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `townId` int NOT NULL,
  `customerName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `visitDate` date NOT NULL,
  `visitPerson` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `visitContent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nextPlan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `townId`(`townId` ASC) USING BTREE,
  CONSTRAINT `visit_records_ibfk_1` FOREIGN KEY (`townId`) REFERENCES `town_sales` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of visit_records
-- ----------------------------

-- ----------------------------
-- Table structure for weeklyreports
-- ----------------------------
DROP TABLE IF EXISTS `weeklyreports`;
CREATE TABLE `weeklyreports`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `files` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `userId` int NOT NULL,
  `createdAt` datetime NOT NULL,
  `date` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `userId`(`userId` ASC) USING BTREE,
  CONSTRAINT `weeklyreports_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 26 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of weeklyreports
-- ----------------------------
INSERT INTO `weeklyreports` VALUES (23, '2026年1月', '', '', '[{\"name\":\"综合平台操作手册 .docx\",\"url\":\"/uploads/1784536819723-599305640.docx\",\"type\":\"\",\"size\":5367250}]', 6, '2026-07-20 16:40:21', '2026年1月');
INSERT INTO `weeklyreports` VALUES (24, '2026年1月', '', '', '[{\"name\":\"工作报告6.5-6.9.docx\",\"url\":\"/uploads/1784536856285-151646377.docx\",\"type\":\"\",\"size\":15860}]', 6, '2026-07-20 16:40:56', '2026年1月');
INSERT INTO `weeklyreports` VALUES (25, '2026年2月', '', '', '[{\"name\":\"综合平台操作手册 .docx\",\"url\":\"/uploads/1784536880276-875615758.docx\",\"type\":\"\",\"size\":5367250}]', 6, '2026-07-20 16:41:21', '2026年2月');

SET FOREIGN_KEY_CHECKS = 1;
