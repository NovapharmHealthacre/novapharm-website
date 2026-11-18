// OpenAI Signals v3.0 public data dictionary: inventory only. Does NOT import
// any CSVs or confer a permission to use personal or sensitive inferred labels.
// https://cdn.openai.com/signals/data-dictionary.pdf
// https://openai.com/signals/data-download/
const TABLES = [
  {
    "name": "global_share_of_messages_by_gender_month.csv",
    "dimensions": [
      "month",
      "typical_name_gender"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_gender_country_month.csv",
    "dimensions": [
      "month",
      "country",
      "typical_name_gender"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_age_group_month.csv",
    "dimensions": [
      "month",
      "age_group"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_age_group_country_month.csv",
    "dimensions": [
      "month",
      "country",
      "age_group"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_age_group_topic_month.csv",
    "dimensions": [
      "month",
      "topic",
      "age_group"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_age_group_topic_country_month.csv",
    "dimensions": [
      "month",
      "topic",
      "country",
      "age_group"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_country_quarter_rank.csv",
    "dimensions": [
      "quarter",
      "country"
    ],
    "metric": "rank",
    "admission": "local-aggregate-preview-only"
  },
  {
    "name": "share_of_messages_by_gender_topic_month.csv",
    "dimensions": [
      "month",
      "topic",
      "typical_name_gender"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_gender_topic_country_month.csv",
    "dimensions": [
      "month",
      "topic",
      "country",
      "typical_name_gender"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_topic_month.csv",
    "dimensions": [
      "month",
      "topic"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_topic_country_month.csv",
    "dimensions": [
      "month",
      "country",
      "topic"
    ],
    "metric": "share_of_messages",
    "admission": "local-aggregate-preview-only"
  },
  {
    "name": "share_of_messages_by_topic_work_related_month.csv",
    "dimensions": [
      "month",
      "work_related",
      "topic"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_topic_work_related_country_month.csv",
    "dimensions": [
      "month",
      "country",
      "work_related",
      "topic"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_work_related_ask_do_express_month.csv",
    "dimensions": [
      "month",
      "work_related",
      "ask_do_express"
    ],
    "metric": "share_of_messages",
    "admission": "local-aggregate-preview-only"
  },
  {
    "name": "share_of_messages_by_work_related_ask_do_express_country_month.csv",
    "dimensions": [
      "month",
      "country",
      "work_related",
      "ask_do_express"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_work_related_month.csv",
    "dimensions": [
      "month",
      "work_related"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_work_related_country_month.csv",
    "dimensions": [
      "month",
      "country",
      "work_related"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_work_related_plan_type_month.csv",
    "dimensions": [
      "month",
      "work_related",
      "plan_type"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_work_related_topic_month.csv",
    "dimensions": [
      "month",
      "work_related",
      "topic"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_messages_by_work_schoolwork_month.csv",
    "dimensions": [
      "month",
      "work_schoolwork"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "usa_share_of_messages_by_state_quarter_rank.csv",
    "dimensions": [
      "quarter",
      "state_code",
      "state_name"
    ],
    "metric": "rank",
    "admission": "metadata-only"
  },
  {
    "name": "usa_share_of_messages_by_topic_quarter.csv",
    "dimensions": [
      "quarter",
      "country",
      "topic"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "usa_share_of_messages_by_topic_state_quarter.csv",
    "dimensions": [
      "quarter",
      "state_code",
      "state_name",
      "topic"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  },
  {
    "name": "share_of_work_related_messages_by_onet_iwa_country_quarter.csv",
    "dimensions": [
      "country",
      "quarter",
      "iwa_cleaned"
    ],
    "metric": "share_of_messages",
    "admission": "metadata-only"
  }
];

export const signalsV3TableRegistry = Object.freeze(TABLES.map(row => Object.freeze({
  ...row, dimensions: Object.freeze(row.dimensions)
})));
export const signalsV3PreviewAllowlist = Object.freeze([
  "share_of_messages_by_topic_country_month.csv",
  "share_of_messages_by_country_quarter_rank.csv",
  "share_of_messages_by_work_related_ask_do_express_month.csv"
]);
export const signalsV3PublicDataDictionaryUrl = "https://cdn.openai.com/signals/data-dictionary.pdf";
export function signalsV3TableByName(filename) {
  return signalsV3TableRegistry.find(row => row.name === filename) ?? null;
}
